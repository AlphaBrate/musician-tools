// Check if the browser supports HDR media queries and color() function
function checkHDR() {
	// Check for HDR media queries support
	var mediaCheck = window.matchMedia(
		"(dynamic-range: high) and (color-gamut: p3)"
	).matches;
	// Check for color() function support
	var supportCheck =
		window.CSS && window.CSS.supports("color", "color(display-p3 1 1 1)");
	if (mediaCheck && supportCheck) {
		return true;
	}
	return false;
}

const supportsHDR = checkHDR();

// User preferences object
const preferences = {
	flash: {
		enable: false,
		colors: {
			0: 'gray',
			2: 'white'
		}
	},
	keyboard: {
		arrowKeys: {
			reverse: {
				horizontal: false,
				vertical: true
			}
		}
	}
};

// Check if the user is on a mobile device
const isMobile = window.matchMedia("(max-width: 767px)").matches;

if (isMobile) {
	alert('This is a very early version of the app. We have not yet optimized it for mobile devices.');
	alert('Features may not work as expected on your device.');
}