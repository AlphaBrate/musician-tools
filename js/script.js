// Check if the browser supports HDR media queries and color() function
function checkHDR() {
	// Check for HDR media queries support
	var mediaCheck = window.matchMedia(
		"(dynamic-range: high) and (color-gamut: p3)",
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
			0: "gray",
			2: "white",
		},
	},
	keyboard: {
		arrowKeys: {
			reverse: {
				horizontal: false,
				vertical: true,
			},
		},
	},
};

// Check if the user is on a mobile device
const isMobile = window.matchMedia("(max-width: 768px)").matches;

if (isMobile) {
	alert("Features may not work as expected on your device.");
}

document.addEventListener("DOMContentLoaded", function () {
	lucide.createIcons();

	// document.querySelectorAll("filter").forEach((filter) => {
	// 	const listenToSelector = filter.getAttribute("listento");
	// 	if (listenToSelector) {
	// 		filter.querySelectorAll("feImage").forEach((feImage) => {
	// 			const tempoSet = document.querySelector(listenToSelector);
	// 			const dimensions = [
	// 				tempoSet.offsetWidth,
	// 				tempoSet.offsetHeight,
	// 			];
	// 			feImage.setAttribute("width", dimensions[0]);
	// 			feImage.setAttribute("height", dimensions[1]);
	// 		});
	// 	}
	// });

    document.querySelectorAll(".apply-glass").forEach(w=>{
        w.classList.remove("apply-glass");
    })
});

// Right click ui: context-menu

const rightUI = document.querySelector(".context-menu");

var contextMenuPreventGoOnce = false;

document.addEventListener("contextmenu", function (e) {
	if (e.target.closest(".node")) {
		return;
	}
	e.preventDefault();
	const viewportWidth = document.documentElement.clientWidth;
	const viewportHeight = document.documentElement.clientHeight;
	const rect = rightUI.getBoundingClientRect();
	const menuWidth = rect.width || rightUI.offsetWidth || 200;
	const menuHeight = rect.height || rightUI.offsetHeight || 200;
	let left = e.clientX;
	let top = e.clientY;
	if (left + menuWidth > viewportWidth) {
		left = Math.max(0, viewportWidth - menuWidth - 8);
	}
	if (top + menuHeight > viewportHeight) {
		top = Math.max(0, viewportHeight - menuHeight - 8);
	}
	rightUI.style.left = `${left}px`;
	rightUI.style.top = `${top}px`;
	rightUI.classList.add("active");
});

document.addEventListener("click", function (e) {
	if (!rightUI.contains(e.target) && !contextMenuPreventGoOnce) {
		rightUI.classList.remove("active");
	}
    contextMenuPreventGoOnce = false;
});

document.querySelectorAll(".rightui-action").forEach((w) => {
	w.addEventListener("click", () => {
		rightUI.classList.remove("active");
	});
});

document.getElementById("bpm-input").addEventListener("input", (e) => {
	let v = e.target.value;
	// Allow only numbers, 5 <= value <= 500
	// Remove non-digits
	v = v.replace(/[^0-9]/g, "");
});

document.getElementById("bpm-input").addEventListener("change", (e) => {
	let v = e.target.value;
	// If empty, just set and return
	if (v === "") {
		e.target.value = metronome.tempo;
		return;
	}
	// Parse and clamp between 5 and 500
	let n = parseInt(v, 10);
	if (isNaN(n)) {
		e.target.value = "";
		return;
	}
	if (n < 5) n = 5;
	if (n > 500) n = 500;
	e.target.value = String(n);

	updateTempo(n);
});

function createTempoNode() {
	const container = document.querySelector(".tempo-nodes");

	function randomID() {
		return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	const id = randomID();

	// Keep markup simple in a template string; move behavior to JS event listeners below
	const temopNodeElement = `
		<div class="node-inner">
			<div class="handle"></div>
			<span class="tempo text-2xl font-bold">
				<input type="text" class="tempo-input" value="${metronome.tempo}">
			</span>
			<div class="collapse-btn absolute right-3 top-2 opacity-50 cursor-pointer rounded-full h-5 w-5">
				<i data-lucide="circle-chevron-up"></i>
			</div>
			<div class="details">
				<span class="hints opacity-[50%] text-xs">Quickly change tempo.</span>
				<div class="time-signature flex flex-row text-2xl gap-2 mt-2">
					<input type="text" class="stress-input field-sizing-content bg-transparent" value="${metronome.stress}">
					<span class="text-nowrap">/ 4</span>
				</div>
				<div class="mt-6 flex flex-row gap-2 items-center cursor-pointer text-xs remove-btn">
					<div class="scale-[.7]"><i data-lucide="trash"></i></div>
					<span>Remove</span>
				</div>
			</div>
		</div>`;

	if (!container) return;

	// Create wrapper and insert markup
	const wrapper = document.createElement("div");
	wrapper.className = "node";
	wrapper.id = id;
	wrapper.innerHTML = temopNodeElement;

	// Elements
	const tempoInput = wrapper.querySelector(".tempo-input");
	const stressInput = wrapper.querySelector(".stress-input");
	const collapseBtn = wrapper.querySelector(".collapse-btn");
	const handle = wrapper.querySelector(".handle");

	// Tempo input: keep only digits and don't allow empty on change
	tempoInput.addEventListener("input", (e) => {
		let v = e.target.value;
		v = v.replace(/[^0-9]/g, "");
		e.target.value = v;
	});
	tempoInput.addEventListener("change", (e) => {
		let v = e.target.value;
		if (v === "") {
			e.target.value = metronome.tempo;
			return;
		}
		let n = parseInt(v, 10);
		if (isNaN(n)) {
			e.target.value = "";
			return;
		}
		if (n < 5) n = 5;
		if (n > 500) n = 500;
		e.target.value = String(n);
	});

	// Stress input behavior moved from inline JS
	stressInput.addEventListener("keydown", function () {
		this.dataset.old = this.value;
	});
	stressInput.addEventListener("input", function () {
		const valid = [0, 2, 3, 4, 6];
		let val = parseInt(this.value);
		if (!isNaN(val) && !valid.includes(val)) {
			let old = parseInt(this.dataset.old) || 0;
			let goingUp = val > old;
			let choices = goingUp
				? valid.filter((n) => n >= val)
				: valid.filter((n) => n <= val);
			if (choices.length > 0) {
				this.value = goingUp ? choices[0] : choices[choices.length - 1];
			} else {
				this.value = val > 6 ? 6 : 0;
			}
		}
	});
	stressInput.addEventListener("change", function () {
		if (this.value === "") this.value = 4;
	});

	// Press behavior: long press to expand, short click to apply tempo/stress from node
	(function () {
		const HOLD_MS = 600;
		const DRAG_THRESHOLD = 8;
		let holdTimer = null;
		let longPressed = false;
		let dragStart = false;
		let dragging = false;
		let dragStartX = 0;
		let dragStartY = 0;
		let startLeft = 0;
		let startTop = 0;

		function clearHold() {
			if (holdTimer) {
				clearTimeout(holdTimer);
				holdTimer = null;
			}
			longPressed = false;
		}

		function clearDrag() {
			dragStart = false;
			dragging = false;
			wrapper.classList.remove("dragging");
		}

		handle.addEventListener("pointerdown", function (e) {
			if (e.button !== 0) return;
			dragStart = true;
			dragging = false;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			startLeft = wrapper.offsetLeft;
			startTop = wrapper.offsetTop;
			wrapper.setPointerCapture(e.pointerId);
		});

		wrapper.addEventListener("pointermove", function (e) {
			if (!dragStart) return;
			const dx = e.clientX - dragStartX;
			const dy = e.clientY - dragStartY;
			if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
				dragging = true;
				clearHold();
			}
			if (dragging) {
				wrapper.style.left = `${startLeft + dx}px`;
				wrapper.style.top = `${startTop + dy}px`;
			}
		});

		wrapper.addEventListener("pointerdown", function (e) {
			if (
				e.target.closest(".collapse-btn") ||
				e.target.closest(".remove-btn")
			)
				return;
			longPressed = false;
			holdTimer = setTimeout(() => {
				longPressed = true;
				wrapper.classList.add("expanded");

				clearHold();
				clearDrag();
			}, HOLD_MS);
		});

		wrapper.addEventListener("pointerup", function (e) {
			if (
				e.target.closest(".collapse-btn") ||
				e.target.closest(".remove-btn")
			) {
				clearHold();
				clearDrag();
				return;
			}
			if (dragging) {
				clearDrag();
				clearHold();
				return;
			}
			if (holdTimer) {
				clearTimeout(holdTimer);
				holdTimer = null;
			}
			if (longPressed) {
				// already expanded on long press
				longPressed = false;
				return;
			}
			clearDrag();
			// Short press: apply tempo and stress from this node
			if (!wrapper.classList.contains("expanded")) {
				const t = parseInt(tempoInput.value, 10);
				const s = parseInt(stressInput.value, 10);
				if (!isNaN(t)) {
					let n = t;
					if (n < 5) n = 5;
					if (n > 500) n = 500;
					metronome.tempo = n;
					updateTempo(n);
					// reflect in global bpm input
					const bpmInput = document.getElementById("bpm-input");
					if (bpmInput) bpmInput.value = String(n);
				}
				if (!isNaN(s)) {
					const times = [0, 2, 3, 4, 6];
					const oldIndex = times.indexOf(metronome.stress);
					const newIndex = times.indexOf(s);
					const difference = newIndex - oldIndex;
					adjustTimeSignature(difference);
					metronome.stress = s;
				}
			}
		});

		wrapper.addEventListener("pointercancel", function () {
			clearHold();
			clearDrag();
		});
		wrapper.addEventListener("pointerleave", function () {
			// pointerleave may occur during hold; cancel
			clearHold();
		});
	})();
	// Collapse when collapse button clicked
	collapseBtn.addEventListener("click", function (e) {
		e.stopPropagation();
		wrapper.classList.remove("expanded");
	});

	// Remove node when remove button clicked
	const removeBtn = wrapper.querySelector(".remove-btn");
	removeBtn.addEventListener("click", function (e) {
		e.stopPropagation();
		wrapper.remove();
	});

	container.appendChild(wrapper);

	const containerStyle = getComputedStyle(container);
	if (containerStyle.position === "static") {
		container.style.position = "relative";
	}
	wrapper.style.position = "absolute";
	wrapper.style.left = `${wrapper.offsetLeft}px`;
	wrapper.style.top = `${wrapper.offsetTop}px`;
	wrapper.style.touchAction = "none";
	wrapper.style.userSelect = "none";

	lucide.createIcons();
}
