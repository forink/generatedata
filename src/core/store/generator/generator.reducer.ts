import { AnyAction } from 'redux';
import { generate } from 'shortid';
import produce from 'immer';
// @ts-ignore-line
import config from '../../../../dist/config.client';
import * as actions from './generator.actions';
import * as mainActions from '../main/main.actions';
import * as packetActions from '../packets/packets.actions';
import { BuilderLayout } from '../../builder/Builder.component';
import { ExportSettingsTab } from '../../exportSettings/ExportSettings.types';
import { DataTypeFolder, ExportTypeFolder } from '../../../_plugins';
import { dataTypeNames } from '~utils/dataTypeUtils';
import { exportTypeNames } from '~utils/exportTypeUtils';

export type DataRow = {
	id: string;
	title: string;
	dataType: DataTypeFolder | null;
	data: any;
};

export type DataRows = {
	[id: string]: DataRow;
};

export type PreviewData = {
	[id: string]: any;
};

// we store all settings separately so in case a user switches from one to another, the previous settings aren't
// wiped out
export type ExportTypeSettings = {
	[exportType in ExportTypeFolder]: any;
};

export type GeneratorPanel = 'grid' | 'preview';

export type GeneratorState = {
	loadedDataTypes: {
		[str in DataTypeFolder]: boolean;
	};
	loadedExportTypes: {
		[str in ExportTypeFolder]: boolean;
	};

	// this is set to true on load after all necessary export types, data types for whatever last config they
	// has have loaded, as well as re-generate a new batch of preview data. It's used to show a spinner in the
	// Preview panel until it's ready to show data
	initialDependenciesLoaded: boolean;
	exportType: ExportTypeFolder;
	rows: DataRows;
	sortedRows: string[];
	showGrid: boolean;
	showPreview: boolean;
	smallScreenVisiblePanel: GeneratorPanel;
	builderLayout: BuilderLayout;
	showExportSettings: boolean;
	exportTypeSettings: Partial<ExportTypeSettings>;
	showGenerationSettingsPanel: boolean;
	showLineNumbers: boolean;
	enableLineWrapping: boolean;
	theme: string;
	previewTextSize: number;
	dataTypePreviewData: PreviewData;
	exportSettingsTab: ExportSettingsTab;
	numPreviewRows: number;
	stripWhitespace: boolean;
	lastLayoutWidth: number | null;
	lastLayoutHeight: number | null;
	numRowsToGenerate: number;
};

export const getInitialState = (): GeneratorState => ({
	// the extra check for existence on these vars is just to placate the tests (not sure why needed)
	loadedDataTypes: dataTypeNames && dataTypeNames.reduce((acc: any, name: DataTypeFolder) => ({ ...acc, [name]: false }), {}),
	loadedExportTypes: exportTypeNames && exportTypeNames.reduce((acc: any, name: ExportTypeFolder) => ({ ...acc, [name]: false }), {}),
	initialDependenciesLoaded: false,
	exportType: config.defaultExportType,
	rows: {},
	sortedRows: [],
	showGrid: true,
	showPreview: true,
	smallScreenVisiblePanel: 'grid',
	builderLayout: 'horizontal',
	showExportSettings: false,
	exportTypeSettings: {},
	numPreviewRows: 5,
	showLineNumbers: true,
	enableLineWrapping: true,
	theme: 'lucario',
	previewTextSize: 12,
	dataTypePreviewData: {},
	exportSettingsTab: 'exportType',
	showGenerationSettingsPanel: false,
	numRowsToGenerate: 100,
	stripWhitespace: false,
	lastLayoutWidth: null,
	lastLayoutHeight: null
});

export const reducer = produce((draft: GeneratorState, action: AnyAction) => {
	switch (action.type) {
		case mainActions.RESET_STORE:
			const initialState = getInitialState();
			Object.keys(initialState).forEach((key) => {
				// @ts-ignore-line
				draft[key] = initialState[key];
			});
			break;

		case actions.CLEAR_GRID:
			draft.rows = {};
			draft.sortedRows = [];
			break;

		case actions.RESET_GENERATOR: {
			draft.rows = {};
			draft.sortedRows = [];

			const initialState = getInitialState();
			const settingsToReset = [
				'exportType', 'showGrid', 'showPreview', 'builderLayout', 'showExportSettings', 'numPreviewRows',
				'showLineNumbers', 'enableLineWrapping', 'theme', 'previewTextSize', 'exportSettingsTab', 'numRowsToGenerate',
				'stripWhitespace'
			];
			settingsToReset.forEach((setting: any) => {
				// @ts-ignore-line
				draft[setting] = initialState[setting];
			});

			Object.keys(action.payload.exportTypeInitialStates).forEach((et: ExportTypeFolder) => {
				draft.exportTypeSettings[et] = action.payload.exportTypeInitialStates[et];
			});

			break;
		}

		case actions.DATA_TYPE_LOADED:
			draft.loadedDataTypes[action.payload.dataType as DataTypeFolder] = true;
			break;

		case actions.EXPORT_TYPE_LOADED:
			draft.loadedExportTypes[action.payload.exportType as ExportTypeFolder] = true;

			// we only ever initialize the export settings to the initial state when the export type hasn't been
			// loaded yet. Note: this'll be an interesting upgrade problem
			if (!draft.exportTypeSettings[action.payload.exportType as ExportTypeFolder]) {
				draft.exportTypeSettings[action.payload.exportType as ExportTypeFolder] = action.payload.initialState;
			}
			break;

		case actions.ADD_ROWS: {
			const newRowIDs: string[] = [];
			for (let i = 0; i < action.payload.numRows; i++) {
				const rowId = generate();
				draft.rows[rowId] = {
					id: rowId,
					title: '',
					dataType: null,
					data: null
				};
				newRowIDs.push(rowId);
			}
			draft.sortedRows = [
				...draft.sortedRows,
				...newRowIDs
			];
			break;
		}

		// TODO clean up
		case actions.REMOVE_ROW: {
			const trimmedRowIds = draft.sortedRows.filter((i) => i !== action.payload.id);
			const updatedRows: DataRows = {};
			trimmedRowIds.forEach((id) => {
				updatedRows[id] = draft.rows[id];
			});
			draft.rows = updatedRows;
			draft.sortedRows = trimmedRowIds;
			break;
		}

		case actions.CHANGE_TITLE:
			draft.rows[action.payload.id].title = action.payload.value;
			break;

		case actions.SELECT_DATA_TYPE: {
			const { id, value, data, defaultTitle } = action.payload;
			const title = (draft.rows[id].title) ? draft.rows[id].title : defaultTitle;

			draft.rows[id] = {
				...draft.rows[id],
				dataType: value,
				data,
				title
			};
			break;
		}

		case actions.SELECT_EXPORT_TYPE:
			draft.exportType = action.payload.exportType;
			break;

		case actions.REFRESH_PREVIEW_DATA:
			draft.dataTypePreviewData = {
				...action.payload.dataTypePreviewData
			};
			break;

		case actions.CONFIGURE_DATA_TYPE:
			draft.rows[action.payload.id].data = action.payload.data;
			break;

		case actions.CONFIGURE_EXPORT_TYPE:
			draft.exportTypeSettings[draft.exportType] = action.payload.data;
			break;

		case actions.REPOSITION_ROW:
			const newArray = draft.sortedRows.filter((i) => i !== action.payload.id);
			newArray.splice(action.payload.newIndex, 0, action.payload.id);
			draft.sortedRows = newArray;
			break;

		case actions.TOGGLE_GRID:
			draft.showGrid = !draft.showGrid;
			if (!draft.showPreview) {
				draft.showPreview = true;
			}
			break;

		case actions.TOGGLE_PREVIEW:
			draft.showPreview = !draft.showPreview;
			if (!draft.showGrid) {
				draft.showGrid = true;
			}
			break;

		case actions.TOGGLE_LAYOUT:
			draft.builderLayout = draft.builderLayout === 'horizontal' ? 'vertical' : 'horizontal';
			break;

		case actions.TOGGLE_LINE_WRAPPING:
			draft.enableLineWrapping = !draft.enableLineWrapping;
			break;

		case actions.UPDATE_NUM_PREVIEW_ROWS:
			draft.numPreviewRows = action.payload.numRows;
			break;

		case actions.CHANGE_THEME:
			draft.theme = action.payload.theme;
			break;

		case actions.TOGGLE_SHOW_LINE_NUMBERS:
			draft.showLineNumbers = !draft.showLineNumbers;
			break;

		case actions.SET_PREVIEW_TEXT_SIZE:
			draft.previewTextSize = action.payload.previewTextSize;
			break;

		case actions.TOGGLE_EXPORT_SETTINGS:
			draft.showExportSettings = !draft.showExportSettings;
			if (action.payload.tab) {
				draft.exportSettingsTab = action.payload.tab;
			}
			break;

		case actions.SHOW_GENERATION_SETTINGS_PANEL:
			draft.showGenerationSettingsPanel = true;
			break;

		case actions.HIDE_START_GENERATION_PANEL:
			draft.showGenerationSettingsPanel = false;
			break;

		case actions.UPDATE_NUM_ROWS_TO_GENERATE:
			draft.numRowsToGenerate = parseInt(action.payload.numRowsToGenerate, 10);
			break;

		case actions.TOGGLE_STRIP_WHITESPACE:
			draft.stripWhitespace = !draft.stripWhitespace;
			break;

		case actions.SET_PANEL_SIZE:
			const setting = draft.builderLayout === 'horizontal' ? 'lastLayoutHeight' : 'lastLayoutWidth';
			draft[setting] = action.payload.size;
			break;

		case actions.CHANGE_SMALL_SCREEN_VISIBLE_PANEL:
			draft.smallScreenVisiblePanel = draft.smallScreenVisiblePanel === 'grid' ? 'preview' : 'grid';
			break;

		case actions.SET_INITIAL_DEPENDENCIES_LOADED:
			draft.initialDependenciesLoaded = true;
			break;

		case packetActions.START_GENERATION:
			draft.showGenerationSettingsPanel = false;
			break;
	}
}, getInitialState());

export default reducer;
