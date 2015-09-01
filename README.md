# Fupload
Ajaxify forms - a jQuery Plugin

### Basic Installation
`$('#myForm').fupload();`
* default URL will be ajax.php unless set in `options` object or form has an `action` attribute

### Examples
##### Return info from server
```
$('#myForm').fupload({
    returnElement : '#myElement'
});
```
##### Toggle progress bar and return info from server
```
$('#myForm').fupload({
    returnElement : '#myElement',
    progressElement : '#myProgressBar',
    toggleProgress : true
});
```
