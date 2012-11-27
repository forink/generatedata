define([
	"constants",
	"lang",
	"manager"
], function(C, L, manager) {

	"use strict";

	/**
	 * @name XML
	 * @see ExportType
	 * @description Client-side code for the XML Export Type.
	 * @namespace
	 */

	var MODULE_ID = "export-type-XML";
	var LANG = L.exportTypePlugins.XML;
	var _dialog = null;
	var _codeMirror = null;

	var _init = function() {
		var subscriptions = {};
		subscriptions[C.EVENT.RESULT_TYPE.CHANGE] = _resultTypeChanged;
		manager.subscribe(MODULE_ID, subscriptions);

		$(window).resize(_updateDialogDimensions);
		$("#etXMLEditCustomFormat").bind("click", function() { _openEditCustomFormatDialog(); return false; });

		// assign event handlers for the custom sections option
		$("#etXMLUseCustomExportFormat").bind("click", function() {
			if (this.checked) {
				$("#etXMLEditCustomFormat").removeAttr("disabled");
				$("#etXMLRootNodeName,#etXMLRecordNodeName").attr("disabled", "disabled");
				$(".etXMLDefaultFormatLabels").addClass("gdDisabledText");
			} else {
				$("#etXMLEditCustomFormat").attr("disabled", "disabled");
				$("#etXMLRootNodeName,#etXMLRecordNodeName").removeAttr("disabled");
				$(".etXMLDefaultFormatLabels").removeClass("gdDisabledText");
			}
		});

		// for onload
		if ($("#etXML_useCustomExportFormat").attr("checked")) {
			$("#etXML_customFormat").removeAttr("disabled").removeClass("gdDisabled");
		}
	}

	/**
	 * Called when the user changes the result type. This just changes the 2nd column heading to be
	 * "Node Name" rather than the default "Column Title".
	 */
	var _resultTypeChanged = function(msg) {
		if (msg.newExportType == "XML") {
			$("#gdColTitleTop,#gdColTitleBottom").html(LANG.row_label);
		}
	}

	var _openEditCustomFormatDialog = function() {
		var dimensions = _getDialogDimensions();

		// calculate size of main content area
		$("#etXMLCustomFormatDialog").dialog({
			title: "Custom XML Format",
			modal: true,
			width: dimensions.dialogWidth,
			height: dimensions.dialogHeight,
			open: function() {
				if (_codeMirror == null) {
					_codeMirror = CodeMirror.fromTextArea($("#etXMLCustomSmarty")[0], {
						mode: "xml",
						lineNumbers: true
					});
					$("#etXMLCustomContent .CodeMirror").addClass("CodeMirror_medium");
					$("#etXMLCustomContent .CodeMirror-scroll").css({
						width: dimensions.contentWidth,
						height: dimensions.contentHeight
					});
				}
			},
			buttons: [
			    {
			    	text: "Close",
			    	click: function() {
			    		$(this).dialog("close");
			    	}
			    }
			]
		});

		return false;
	}

	var _getDialogDimensions = function() {
		var dialogHeight  = ($(window).height() / 100) * 90;
		var dialogWidth   = ($(window).width() / 100) * 90;
		var contentHeight = dialogHeight - 110;
		var contentWidth  = dialogWidth - 370;

		return {
			dialogHeight: dialogHeight,
			dialogWidth: dialogWidth,
			contentHeight: contentHeight,
			contentWidth: contentWidth
		}
	}


	/**
	 * Our validation function performed when the user clicks the main Generate button. This ensures the
	 * XML additional settings are filled in properly and all rows have a valid node name.
	 */
	var _validate = function() {
/*
		var missingNodeNames  = [];
		var invalidNodeNames  = [];
		var missingTableNames = [];
		var invalidTableNames = [];

		var visibleRowNum = 0;
		var dataTypeValidationFunctions = [];
		for (var i=0; i<orderedRowIDs.length; i++) {
			var nodeNum = orderedRowIDs[i];
			visibleRowNum++;

			// ignore rows that haven't specified a data type
			if ($("#type_" + nodeNum).val() == "") {
				continue;
			}

			switch (resultType) {
				case "XML":
					if ($("#title_" + nodeNum).val() == "") {
						missingNodeNames.push([$("#title_" + nodeNum), visibleRowNum]);
					} else if ($("#title_" + nodeNum).val().match(/\W/) || $("#title_" + nodeNum).val().match(/^[^a-zA-Z]/)) {
						invalidNodeNames.push([$("#title_" + nodeNum), visibleRowNum]);
					}
					break;

				case "SQL":
					if ($("#title_" + nodeNum).val() == "") {
						missingTableNames.push([$("#title_" + nodeNum), visibleRowNum]);
					} else if ($("#title_" + nodeNum).val().match(/\W/) || $("#title_" + nodeNum).val().match(/^[^a-zA-Z]/)) {
						invalidTableNames.push([$("#title_" + nodeNum), visibleRowNum]);
					}
					break;
			}

			// keep track of the data types that have custom validation routines
			var func_ns = $("#type_" + nodeNum).val() + "_ns";
			if (typeof window[func_ns] === "object" && typeof window[func_ns].validate === "function") {
				if (!_multiDimArrayContains(func_ns, dataTypeValidationFunctions)) {
					dataTypeValidationFunctions.push([func_ns, [nodeNum]]);
				} else {
					dataTypeValidationFunctions = _multiDimArrayAddRow(func_ns, dataTypeValidationFunctions, nodeNum);
				}
			}

			numGeneratedRows++;
		}

		if (missingNodeNames.length) {
			var problemFields = [];
			var rowNumbers    = [];
			for (var i=0; i<missingNodeNames.length; i++) {
				problemFields.push(missingNodeNames[i][0]);
				rowNumbers.push(missingNodeNames[i][1]);
			}
			utils.addValidationErrors({ els: problemFields, error: L.missing_node_names + " <b>" + rowNumbers.join(", ") + "</b>" });
		}
		if (invalidNodeNames.length) {
			var problemFields = [];
			var rowNumbers    = [];
			for (var i=0; i<invalidNodeNames.length; i++) {
				problemFields.push(invalidNodeNames[i][0]);
				rowNumbers.push(invalidNodeNames[i][1]);
			}
			utils.addValidationErrors({ els: problemFields, error: L.missing_node_names + " <b>" + rowNumbers.join(", ") + "</b>" });
			Generator.errors.push({ els: problemFields, error: L.invalid_node_names + " <b>" + rowNumbers.join(", ") + "</b>" });
		}
		if (missingTableNames.length) {
			var problemFields = [];
			var rowNumbers    = [];
			for (var i=0; i<missingTableNames.length; i++) {
				problemFields.push(missingTableNames[i][0]);
				rowNumbers.push(missingTableNames[i][1]);
			}
			Generator.errors.push({ els: problemFields, error: L.missing_table_names + " <b>" + rowNumbers.join(", ") + "</b>" });
		}
		if (invalidTableNames.length) {
			var problemFields = [];
			var rowNumbers    = [];
			for (var i=0; i<invalidTableNames.length; i++) {
				problemFields.push(invalidTableNames[i][0]);
				rowNumbers.push(invalidTableNames[i][1]);
			}
			Generator.errors.push({ els: problemFields, error: L.invalid_table_names + " <b>" + rowNumbers.join(", ") + "</b>" });
		}

		if (resultType == "XML") {
			if ($("#xml_root_node_name").val() == "") {
				Generator.errors.push({ els: [$("#xml_root_node_name")], error: L.missing_xml_root_node_name });
			} else if ($("#xml_root_node_name").val().match(/\W/)) {
				Generator.errors.push({ els: [$("#xml_root_node_name")], error: L.invalid_xml_root_node_name });
			} else if ($("#xml_record_node_name").val() == "") {
				Generator.errors.push({ els: [$("#xml_record_node_name")], error: L.missing_xml_record_node_name });
			} else if ($("#xml_record_node_name").val().match(/\W/)) {
				Generator.errors.push({ els: [$("#xml_record_node_name")], error: L.invalid_xml_record_node_name });
			}
		}
*/
	}

	var _updateDialogDimensions = function() {
		var dimensions = _getDialogDimensions();
		$("#etHTMLCustomFormatDialog").dialog("option", "width", dimensions.dialogWidth);
		$("#etHTMLCustomFormatDialog").dialog("option", "height", dimensions.dialogHeight);
	}

	manager.register(MODULE_ID, C.COMPONENT.EXPORT_TYPE, {
		init: _init,
		validate: _validate
	});
});