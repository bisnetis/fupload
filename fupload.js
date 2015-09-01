$.fn.fupload = function (options) {
	this.each(function() {
		var element = $(this);
		var element_type;
		var can_formdata = (options.useFrame === true || typeof window.FormData === 'undefined') ? false : true;
		var uniqid = (new Date).getTime();
		
		//set defaults
		options.checkRequired = (typeof options.checkRequired !== 'undefined') ? options.checkRequired : true ;
		options.checkExtensions = (typeof options.extensions !== 'undefined') ? options.checkExtensions : true ;
		options.requestType = (typeof options.requestType !== 'undefined') ? options.requestType : "POST" ;
		options.errorMsgs = (typeof options.errorMsgs !== 'undefined') ? options.errorMsgs : {
			'required' : "Not all required fields were filled out",
			'extension' : "One or more files have an invalid file extension",
			'filesize' : "One or more files exceed the file size limit of " + String(options.maxSize / 1000) + " MB"
		} ;
		options.extensions = (typeof options.extensions !== 'undefined') ? options.extensions : ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"] ;
		options.checkSize = (typeof options.checkSize !== 'undefined') ? options.checkSize : false ;
		options.maxSize = (typeof options.maxSize !== 'undefined') ? options.maxSize : 5000 ;
		options.progressElement = (typeof options.progressElement !== 'undefined') ? options.progressElement : element.find('progress') ;
		options.showProgress = (typeof options.showProgress !== 'undefined') ? options.showProgress : true ;
		options.toggleProgress = (typeof options.toggleProgress !== 'undefined') ? options.toggleProgress : false ;
		if (options.toggleProgress === true) {
			$(options.progressElement).hide();
		}
			//cater for browser that doesn't handle formdata - iframe support
		if (can_formdata === false) {
			options.iframe = $("<iframe name='ifupload_" + uniqid + "' style='display: none;'></iframe>");
		}
			
			
		//check type of element
		if (element.is("form") === true) {
			element_type = "form";
			if (typeof options.url === 'undefined' || options.url === '') {
				options.url = (typeof element.attr('action') !== 'undefined') ? element.attr('action') : "ajax.php";
			}
			if (typeof options.submitButton !== 'undefined') {
				$(options.submitButton).click(function() {
					(can_formdata === false) ? "" : upload.upload();
				});
			} else {
				options.submitButton = element.find("button[name=submit]");
				options.submitButton.click(function() {
					(can_formdata === false) ? "" : upload.upload();
				});
			}
			if (typeof element.attr("close") !== 'undefined' || element.attr("close") !== false) {
				options.closeUrl = element.attr("close");
			}
			if (can_formdata === false) {
				element.after(options.iframe);
				element.attr("target", "ifupload_" + uniqid);
				if (typeof element.attr('action') === 'undefined') {
					element.attr("action", options.url);
				}
				if (typeof element.attr('method') === 'undefined') {
					element.attr("method", options.requestType);
				}
				element.attr("enctype", "multipart/form-data");
				if (options.submitButton.attr("type") !== "submit") {
					options.submitButton.attr("type", "submit");
				}
				if (typeof options.beforeSend !== 'undefined' || typeof options.progressElement !== 'undefined') {
					element.bind("submit", function() {
						if (typeof options.progressElement !== 'undefined') {
							$(options.progressElement).fadeIn("fast");
						}
						options.beforeSend();
						return true;
					});
				}
				options.iframe.load(function() {
					var iframe_body = $(window[options.iframe.attr('name')].document.getElementsByTagName("body")[0]);
					upload.iframeCompleteHandler(iframe_body.html());
					if (typeof options.progressElement !== 'undefined') {
						$(options.progressElement).fadeOut("fast");
					}
				});
			}
		} else if (element.is("input[type=file]") === true) {
			element_type = "input";
			if (typeof options.url === 'undefined' || options.url === '') {
				options.url = "ajax.php";
			}
		}
		
		var upload = {
			extensions : options.extensions,
			formData : "",
			//build and execute upload process
			upload : function () {
				var safe = true;
				var errs = [];
				
				if (element_type === "form" && options.checkRequired === true) {
					safe = upload.checkRequired();
					if (safe === false) {
						errs.push(String(options.errorMsgs.required));
					}
				}
				if (options.checkExtensions !== false && safe === true) {
					safe = upload.checkExtension();
					if (safe === false) {
						errs.push(String(options.errorMsgs.extension));
					}
				}
				if (options.checkSize === true && safe === true) {
					safe = upload.checkSize();
					if (safe === false) {
						errs.push(String(options.errorMsgs.filesize));
					}
				}
				if (safe === true) {
					if (typeof options.beforeSend !== 'undefined') {
						options.beforeSend();
					}
					if (can_formdata === true) {
						upload.formData = new FormData();
						upload.getUserData();
						upload.sendForm();
					} else {
						if (element_type === "form") {
							element.submit();
						}
					}
				}
				if (errs.length > 0) {
					upload.alertError(errs);
				}
			},
			//send form data to server
			sendForm : function () {
				if (options.toggleProgress === true) {
					$(options.progressElement).fadeIn("fast");
				}
				var ajax = new XMLHttpRequest();
				if (typeof options.closeUrl !== 'undefined') {
					ajax.addEventListener("load", upload.navigateClose, false);
				} else {
					ajax.addEventListener("load", upload.completeHandler, false);
				}
				if (options.showProgress === true) {
					ajax.upload.addEventListener("progress", upload.progressHandler, false);
				}
				ajax.open(options.requestType, options.url);
				ajax.send(upload.formData);
			},
			//validate files' extension
			checkExtension : function () {
				var ext, safe = true;
				if (element_type === "form") {
					element.find("input[type=file]").each(function() {
						var files = $(this).get()[0].files;
						for (var i = 0; i < files.length; i++) {
							ext = files[i].name.substr(files[i].name.lastIndexOf('.')+1);
							if ($.inArray(ext, options.extensions, 0) === -1) {
								safe = false;
								return false;
							}
						}
					});
				} else if (element_type === "input") {
					var files = element.get()[0].files;
					for (var i = 0; i < files.length; i++) {
						ext = files[i].name.substr(files[i].name.lastIndexOf('.')+1);
						if ($.inArray(ext, options.extensions, 0) === -1) {
							safe = false;
							return false;
						}
					}
				}
				return safe;
			},
			//check required fields
			checkRequired : function () {
				var safe = true;
				element.find("input").each(function() {
					if ($(this).attr('required') === "required" && $(this).val() === "") {
						safe = false;
					}
				});
				
				return safe;
			},
			//check file size
			checkSize : function () {
				var size, safe = true;
				if (element_type === "form") {
					element.find("input[type=file]").each(function() {
						var files = $(this).get()[0].files;
						for (var i = 0; i < files.length; i++) {
							size = files[i].size / 1000;
							if (size > options.maxSize) {
								safe = false;
								return false;
							}
						}
					});
				} else if (element_type === "input") {
					var files = element.get()[0].files;
					for (var i = 0; i < files.length; i++) {
						size = files[i].size / 1000;
						if (size > options.maxSize) {
							safe = false;
							return false;
						}
					}
				}
				return safe;
			},
			//get custom form data
			getUserData : function() {
				//get all current form data
				if (element_type === "form") {
					//check if any instances of tinymce exist
					if (typeof tinyMCE !== 'undefined' && typeof tinyMCE.editors !== 'undefined' && element.find('.mce-tinymce').length > 0 && element_type === "form") {
						var tinymce_element, current_name, tinymce_id;
						element.find(".mce-tinymce").each(function() {
							tinymce_id = $(this).next().attr('id');
							tinymce_element = tinyMCE.editors[tinymce_id].getElement();
							current_name = $(tinymce_element).attr("name");
							//check if textarea for tinymce already created
							if ($("textarea[name=" + current_name + "]").length > 0) {
								$("textarea[name=" + current_name + "]").text(tinyMCE.editors[tinymce_id].getContent({format: "html"}));
							} else {
								var new_textarea = $("<textarea style='display:none;'></textarea>");
								new_textarea.attr("name", String(current_name));
								new_textarea.text(tinyMCE.editors[tinymce_id].getContent({format: "html"}));
								element.append(new_textarea);
							}
						});
					}
					upload.formData = new FormData(element.get()[0]);
				}
					//add data from other forms
				if (typeof options.formArray !== 'undefined') {
					var current_form, current_element, file, file_count, current_name;
						//loop form array jquery selector strings
					for (var f = 0; f < options.formArray.length; f++) {
						current_form = $(options.formArray[f]); //current form jquery object
							//loop input of type file
						current_form.find("input[type=file]").each(function() {
							current_element = $(this); //current input jquery object
							current_name = current_element.attr('name'); //current input element name
								//check if multi file upload / single file upload
							if (current_element.attr('multiple') === 'multiple') {
								file_count = current_element.get()[0].files.length; //get total files selected
									//loop through and add each file
								for (var _file; _file < file_count; _file++) {
									upload.formData.append(String(current_name), current_element.get()[0].files[_file]);
								}
							} else {
								upload.formData.append(current_name, current_element.get()[0].files[0]);
							}
						});
							//check if current form has tinymce editors
						if (typeof tinyMCE !== 'undefined' && typeof tinyMCE.editors !== 'undefined' && current_form.find('.mce-tinymce').length > 0) {
							var tinymce_element, current_name, tinymce_id;
							current_form.find(".mce-tinymce").each(function() {
								tinymce_id = $(this).next().attr('id');
								tinymce_element = tinyMCE.editors[tinymce_id].getElement();
								current_name = $(tinymce_element).attr("name");
								//check if textarea for tinymce already created
								if ($("textarea[name=" + current_name + "]").length > 0) {
									$("textarea[name=" + current_name + "]").text(tinyMCE.editors[tinymce_id].getContent({format: "html"}));
								} else {
									var new_textarea = $("<textarea style='display:none;'></textarea>");
									new_textarea.attr("name", String(current_name));
									new_textarea.text(tinyMCE.editors[tinymce_id].getContent({format: "html"}));
									current_form.append(new_textarea);
								}
							});
						}
							//get all other form elements
						var current_element_array = current_form.serializeArray();
						for (var cea = 0; cea < current_element_array.length; cea++) {
							upload.formData.append(current_element_array[cea].name, current_element_array[cea].value);
						}
					}
				}
				//set additional form data if passed
				if (typeof options.formData !== 'undefined') {
					for (var key in options.formData) {
						if (options.formData.hasOwnProperty(key)) {
							upload.formData.append(key, options.formData[key]);
							//form.append(key, options.formData[key]);
							//$('#msg').append(key + "=>" + options.formData[key] + "<br>");
						}
					}
				}
				//get custom form data from elements with specified class name
				if (typeof options.fromClass !== 'undefined') {
					$("." + options.fromClass).each(function() {
						var current_el = $(this);
						//form.append(current_el.attr('name'), current_el.val());
						upload.formData.append(current_el.attr('name'), current_el.val());
						//$('#msg').append(current_el.attr('name') + "=>" + current_el.val() + "<br>");
					});
				}
			},
			alertError : (typeof options.errorElement !== 'undefined') ? function(txt){ $(options.errorElement).html(txt.join('<br>')); } : function(txt) {alert(txt.join('\n'))},
			navigateClose : function () {
				window.location.href = options.closeUrl;
			},
			//EVENT HANDLER : on upload completion
			completeHandler : (typeof options.onComplete !== 'undefined') ? options.onComplete : function (event) {
				//run on complete function(s)
				if (typeof options.completeFuncs !== 'undefined') {
					if (Array.isArray(options.completeFuncs) === true) {
						for (var f = 0; f < options.completeFuncs.length; f++) {
							options.completeFuncs[f]();
						}
					} else {
						options.completeFuncs();
					}
				}
				//return response message to element
				if (typeof options.returnElement !== 'undefined') {
					$(options.returnElement).html(event.target.responseText);
				}
				if (options.toggleProgress === true) {
					$(options.progressElement).fadeOut("fast");
				}
			},
			//EVENT HANDLER : progress of upload
			progressHandler : (typeof options.onProgress !== 'undefined') ? options.onProgress : function (event) {
				if (typeof options.progressElement !== 'undefined') {
					var percent = Math.round((event.loaded / event.total) * 100);
					var pb = $(options.progressElement);
					if (pb.hasClass("progress") === true) {
						pb.children("div.progress-bar").css("width", percent + "%");
						pb.children("div.progress-bar").html(percent + "%");
					} else {
						$(options.progressElement).val(percent);
					}
				}
			},
			//EVENT HANDLER : on complete - IFRAME
			iframeCompleteHandler : (typeof options.onComplete !== 'undefined') ? options.onComplete : function (iframe_body) {
				//run on complete function(s)
				if (typeof options.completeFuncs !== 'undefined') {
					if (Array.isArray(options.completeFuncs) === true) {
						for (var f = 0; f < options.completeFuncs.length; f++) {
							options.completeFuncs[f]();
						}
					} else {
						options.completeFuncs();
					}
				}
				//return response message to element
				if (typeof options.returnElement !== 'undefined') {
					$(options.returnElement).html(iframe_body);
				}
				if (options.toggleProgress === true) {
					$(options.progressElement).fadeOut("fast");
				}
			}
		};
	});
};
