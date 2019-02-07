if($.fn.modal) {
    console.log("Bootstrap is loaded from CDN")
    console.log($.fn.modal)
} else {
    console.log("Running Fallback. Bootstrap is NOT loaded from CDN")
}
if (! $.fn.modal) {
  document.write('<script src="{{ STATIC_URL }}bootstrap_413/js/bootstrap.min.js"><\/script>');
  document.write('<link rel="stylesheet" href="{{ STATIC_URL }}bootstrap_413/css/bootstrap.min.css" />');
  document.write('<link rel="stylesheet" href="{{ STATIC_URL }}bootstrap_413/css/bootstrap-reboot.min.css" />');
  document.write('<link rel="stylesheet" href="{{ STATIC_URL }}bootstrap_413/css/bootstrap-grid.css" />');
}
