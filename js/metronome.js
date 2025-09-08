let metronome = {
	playing: false,
	tempo: 120,
	stress: 4,
	instance: document.querySelector(".metronome"),
};

const tempoAdjustComponent = document.querySelector(
	".metronome-body>.metronome-component.swing>.tempo-set"
);
const timeSignatureAdjuster = {
	image: document.querySelector(".metronome-body>.time-signature-adjuster"),
	instance: document.querySelector(
		".metronome-body>.time-signature-adjuster-instance"
	),
};
const tempoSwingInstance = document.querySelector(
	".metronome-body>.metronome-component.swing>.swing-instance"
);
const swingComponent = document.querySelector(
	".metronome-body>.metronome-component.swing"
);
const metronomeBody = document.querySelector(".metronome-body");
const tempoDisplay = metronome.instance.querySelector(".tempo");
const beatsElement = document.querySelector(".beats"); // Reference to .beats element

let isDragging = false;
let dragType = null; // Track the type of dragging ('tempo', 'swing', or 'precise-tempo')
let currentX = 0;
let currentY = 0;
let dragAttempts = 0;
let lastDragDirection = null;
let previousTempo = metronome.tempo;
let lastDragTime = null;
let lastTempoPosition = null;
let accumDeltaY = 0;

// Time signature dragging variables
let isDraggingTimeSignature = false;
let timeCurrentX = 0;
let timeDragAttempts = 0;
let lastTimeDragDirection = null;
let previousStress = metronome.stress;
const timeSignatureValues = [0, 2, 3, 4, 6];
const pixelThreshold = 20; // Threshold for pixel movement
const positionStep = 2; // Step for time signature adjustment

// Register custom sounds
loadCustomSound(
	"assets/metronome/audio/classic-click0.wav",
	"strongBeat"
).catch(console.error);
loadCustomSound(
	"assets/metronome/audio/classic-click2.wav",
	"normalBeat"
).catch(console.error);
loadCustomSound(
	"assets/metronome/audio/classic-tempo-adjust.wav",
	"tempoAdjust"
).catch(console.error);
loadCustomSound(
	"assets/metronome/audio/classic-time-adjust.wav",
	"timeAdjust"
).catch(console.error);

// Initialize tempo position
function initTempoPosition() {
	const minPercent = -45;
	const maxPercent = 15;
	const tempoRange = 208 - 40; // Range for tempo adjustment
	const percent =
		minPercent +
		((metronome.tempo - 40) / tempoRange) * (maxPercent - minPercent);
	metronome.instance.style.setProperty("--tempo-position", `${percent}%`);

	const tempoSetElement = metronome.instance.querySelector(".tempo-set");
	const tempoSetRect = tempoSetElement.getBoundingClientRect();
	const tempoSetPosition = tempoSetRect.top + window.scrollY;
	metronome.instance.style.setProperty(
		"--tempo-pixel-position",
		`${tempoSetPosition}px`
	);
	lastTempoPosition = tempoSetPosition;
}

// Update beats element with spans based on time signature
function updateBeatsDisplay() {
	if (beatsElement) {
		beatsElement.innerHTML = ""; // Clear existing spans
		const beatCount = metronome.stress;
		for (let i = 0; i < beatCount; i++) {
			const span = document.createElement("span");
			span.classList.add("beat");
			if (i === 0) {
				span.classList.add("stress"); // First beat is stressed
			}
			beatsElement.appendChild(span);
		}
	}
}

// Initialize time signature position and beats display
function initTimeSignaturePosition() {
	const index = timeSignatureValues.indexOf(metronome.stress);
	const percent = index * positionStep;
	metronome.instance.style.setProperty(
		"--time-signature-position",
		`${percent}%`
	);
	updateBeatsDisplay(); // Initialize beats display
}

// Call initialization functions
initTempoPosition();
initTimeSignaturePosition();

// Set tempo position based on the current tempo value
function setTempoPosition(tempo) {
	metronome.tempo = tempo; // Update the tempo
	const minPercent = -45;
	const maxPercent = 15;
	const tempoRange = 208 - 40; // Range for tempo adjustment
	let percent =
		minPercent + ((tempo - 40) / tempoRange) * (maxPercent - minPercent); // Clamp percent within range

	percent = Math.max(minPercent, Math.min(maxPercent, percent));
	metronome.instance.style.setProperty("--tempo-position", `${percent}%`);

	const tempoSetElement = metronome.instance.querySelector(".tempo-set");
	const tempoSetRect = tempoSetElement.getBoundingClientRect();
	const tempoSetPosition = tempoSetRect.top + window.scrollY;
	metronome.instance.style.setProperty(
		"--tempo-pixel-position",
		`${tempoSetPosition}px`
	);
}

// Event listeners for tempo drag (tempo-set)
tempoAdjustComponent.addEventListener("mousedown", (e) =>
	startDragging(e, "tempo")
);
tempoAdjustComponent.addEventListener(
	"touchstart",
	(e) => startDragging(e, "tempo"),
	{
		passive: false,
	}
);

// Event listeners for precise tempo drag (.tempo)
tempoDisplay.addEventListener("mousedown", (e) =>
	startDragging(e, "precise-tempo")
);
tempoDisplay.addEventListener(
	"touchstart",
	(e) => startDragging(e, "precise-tempo"),
	{
		passive: false,
	}
);

// Event listeners for swing drag (swing-instance)
tempoSwingInstance.addEventListener("mousedown", (e) =>
	startDragging(e, "swing")
);
tempoSwingInstance.addEventListener(
	"touchstart",
	(e) => startDragging(e, "swing"),
	{
		passive: false,
	}
);

// Global drag event listeners
document.addEventListener("mousemove", drag);
document.addEventListener("mouseup", stopDragging);
document.addEventListener("touchmove", drag, { passive: false });
document.addEventListener("touchend", stopDragging);

// Event listeners for time signature drag
timeSignatureAdjuster.instance.addEventListener(
	"mousedown",
	startTimeSignatureDragging
);
timeSignatureAdjuster.instance.addEventListener(
	"touchstart",
	startTimeSignatureDragging,
	{ passive: false }
);
document.addEventListener("mousemove", dragTimeSignature);
document.addEventListener("mouseup", stopTimeSignatureDragging);
document.addEventListener("touchmove", dragTimeSignature, { passive: false });
document.addEventListener("touchend", stopTimeSignatureDragging);

// Keyboard event listener
document.addEventListener("keydown", handleKeyboard);

// Start dragging for tempo, swing, or precise-tempo
function startDragging(e, type) {
	if (!isDragging) {
		isDragging = true;
		dragType = type; // Set the type of dragging
		currentX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
		currentY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
		lastDragTime = performance.now(); // Adjust cursor and state based on drag type

		if (type === "tempo") {
			tempoAdjustComponent.style.cursor = "grabbing";
			metronome.instance.classList.add("dragging");
			previousTempo = metronome.tempo;
			const tempoSetElement =
				metronome.instance.querySelector(".tempo-set");
			const tempoSetRect = tempoSetElement.getBoundingClientRect();
			lastTempoPosition = tempoSetRect.top + window.scrollY;
		} else if (type === "precise-tempo") {
			tempoDisplay.style.cursor = "grabbing";
			metronome.instance.classList.add("dragging");
			previousTempo = metronome.tempo;
			accumDeltaY = 0;
		} else {
			tempoSwingInstance.style.cursor = "grabbing";
			stopMetronome();
			metronome.playing = false;
			metronome.instance.classList.remove("swinging");
			metronome.instance.classList.remove("swinging-left");
		}

		dragAttempts = 0; // Reset drag attempts
		lastDragDirection = null; // Reset last drag direction
		if (e.type === "touchstart") {
			e.preventDefault(); // Prevent default touch behavior
		}
	}
}

let dragTimeout;
let hasPlayedLockSound = true; // Lock sound state
let lockSoundTimeStamps = []; // Timestamps for lock sound

// Handle dragging for tempo, swing, or precise-tempo
function drag(e) {
	if (isDragging) {
		metronome.instance.classList.remove("at-limit"); // Reset at-limit state
		const currentTime = performance.now();
		const clientX =
			e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
		const clientY =
			e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
		const deltaY = clientY - currentY; // Calculate vertical movement
		const deltaTime = (currentTime - lastDragTime) / 1000; // Time since last drag
		currentX = clientX;
		currentY = clientY;
		lastDragTime = currentTime;

		const currentDragDirection = deltaY > 0 ? "down" : "up"; // Determine drag direction
		metronome.instance.classList.remove("up", "down"); // Reset direction classes
		metronome.instance.classList.add(currentDragDirection); // Add current direction class

		if (dragType === "tempo") {
			// Dragging the tempo slider
			const oldTempo = metronome.tempo;
			metronome.tempo = Math.max(
				40,
				Math.min(208, metronome.tempo + deltaY)
			);

			setTempo(metronome.tempo);
			tempoDisplay.textContent = `${Math.round(metronome.tempo)}`; // Update tempo display

			const tempoSetElement =
				metronome.instance.querySelector(".tempo-set");
			const tempoSetRect = tempoSetElement.getBoundingClientRect();
			const currentTempoPosition = tempoSetRect.top + window.scrollY;
			const positionDelta = Math.abs(
				currentTempoPosition - lastTempoPosition
			);
			const positionSpeed = positionDelta / deltaTime; // Calculate speed of dragging
			lastTempoPosition = currentTempoPosition;

			const blurRadius = Math.sqrt(positionSpeed) / 2; // Calculate blur radius
			metronome.instance.style.setProperty(
				"--blur-radius",
				`${blurRadius}px`
			);

			clearTimeout(dragTimeout);
			dragTimeout = setTimeout(() => {
				metronome.instance.style.setProperty("--blur-radius", `0px`);
			}, 50);

			const minPlaybackRate = 1.0;
			const maxPlaybackRate = 1.25;
			const minPositionSpeed = 100;
			const maxPositionSpeed = 1000;
			let playbackRate = minPlaybackRate;

			if (positionSpeed > minPositionSpeed) {
				const normalizedSpeed = Math.min(
					(positionSpeed - minPositionSpeed) /
						(maxPositionSpeed - minPositionSpeed),
					1
				);
				const baseRate =
					minPlaybackRate +
					(maxPlaybackRate - minPlaybackRate) *
						(normalizedSpeed * normalizedSpeed);
				const randomVariation = (Math.random() - 0.5) * 0.2; // Add random variation
				playbackRate = Math.max(
					minPlaybackRate,
					Math.min(maxPlaybackRate, baseRate + randomVariation)
				);
			} // Check for crossed tempo thresholds

			const tempoThresholds = Array.from(
				{ length: Math.floor((208 - 40) / 6) + 1 },
				(_, i) => 40 + i * 6
			);
			const crossedThreshold = tempoThresholds.find(
				(threshold) =>
					(oldTempo < threshold && metronome.tempo >= threshold) ||
					(oldTempo > threshold && metronome.tempo <= threshold)
			);

			if (crossedThreshold) {
				playSoundById("tempoAdjust", playbackRate); // Play sound on threshold crossing
			}

			previousTempo = metronome.tempo;

			const minPercent = -45;
			const maxPercent = 15;
			const tempoRange = 208 - 40; // Range for tempo adjustment
			const percent =
				minPercent +
				((metronome.tempo - 40) / tempoRange) *
					(maxPercent - minPercent);
			metronome.instance.style.setProperty(
				"--tempo-position",
				`${percent}%`
			);

			const realPercentage = Math.min(
				Math.max(((percent + 45) / 60) * 100, 0),
				100
			);
			const almostReachesTop = metronome.instance.querySelector(
				".almost-reaches-top"
			);
			const almostReachesBottom = metronome.instance.querySelector(
				".almost-reaches-bottom"
			); // Show/hide visual cues for tempo limits

			if (realPercentage <= 25) {
				almostReachesTop.style.opacity =
					realPercentage < 15 ? 1 : 1 - (realPercentage - 15) / 10;
				almostReachesTop.style.filter = `blur(${
					(1 - almostReachesTop.style.opacity) * 5
				}px)`;
				almostReachesBottom.style.opacity = 0;
			} else if (realPercentage >= 75) {
				almostReachesBottom.style.opacity =
					realPercentage > 85 ? 1 : (realPercentage - 75) / 10;
				almostReachesBottom.style.filter = `blur(${
					(1 - almostReachesBottom.style.opacity) * 5
				}px)`;
				almostReachesTop.style.opacity = 0;
			} else {
				almostReachesTop.style.opacity = 0;
				almostReachesBottom.style.opacity = 0;
				almostReachesTop.style.filter = `blur(${
					(1 - almostReachesTop.style.opacity) * 5
				}px)`;
				almostReachesBottom.style.filter = `blur(${
					(1 - almostReachesBottom.style.opacity) * 5
				}px)`;
			}

			const tempoSetPosition = tempoSetRect.top + window.scrollY;
			metronome.instance.style.setProperty(
				"--tempo-pixel-position",
				`${tempoSetPosition}px`
			);

			const atMaxTempo = metronome.tempo === 208 && deltaY > 0; // Check if at max tempo
			const atMinTempo = metronome.tempo == 40 && deltaY < 0; // Check if at min tempo // Handle repeated attempts at tempo limits

			if (atMaxTempo || atMinTempo) {
				if (
					lastDragDirection !== null &&
					lastDragDirection !== currentDragDirection
				) {
					dragAttempts = 0; // Reset attempts on direction change
				}
				dragAttempts++;
				lastDragDirection = currentDragDirection;

				metronome.instance.classList.add(
					atMaxTempo ? "at-max" : "at-min"
				);

				if (dragAttempts >= 20) {
					isDragging = false; // Stop dragging
					tempoAdjustComponent.style.cursor = "grab"; // Reset cursor
					dragAttempts = 0; // Reset attempts
					lastDragDirection = null; // Reset last direction
					playSoundById("timeAdjust", 1.0); // Play sound on limit reached
					metronome.instance.classList.remove("up", "down");
					metronome.instance.classList.add("at-limit");

					

					return;
				}
			} else {
				dragAttempts = 0; // Reset attempts if not at limits
				lastDragDirection = currentDragDirection; // Update last direction
				metronome.instance.classList.remove("at-max", "at-min");
			}
		} else if (dragType === "precise-tempo") {
			// Dragging for precise tempo adjustment
			accumDeltaY += deltaY;
			const threshold = pixelThreshold; // Threshold for adjustments
			let changed = false; // Track if change occurred
			metronome.instance.classList.add("precise-dragging"); // Adjust tempo based on accumulated vertical movement

			while (Math.abs(accumDeltaY) >= threshold) {
				if (accumDeltaY >= threshold) {
					metronome.tempo = Math.min(208, metronome.tempo + 1);
					accumDeltaY -= threshold;
				} else if (accumDeltaY <= -threshold) {
					metronome.tempo = Math.max(40, metronome.tempo - 1);
					accumDeltaY += threshold;
				}
				changed = true; // Mark change as occurred
			}

			if (changed) {
				setTempo(metronome.tempo);
				tempoDisplay.textContent = `${Math.round(metronome.tempo)}`; // Update display
				setTempoPosition(metronome.tempo); // Set new tempo position
				playSoundById("tempoAdjust", 1.0); // Play sound on adjustment
			}
		} else if (dragType === "swing") {
			// Dragging the swing arm
			metronome.instance.classList.remove("swinging");
			metronome.instance.classList.remove("swinging-left");
			swingComponent.style.transition = "";
			const swingRect = swingComponent.getBoundingClientRect();
			const pivotX = swingRect.left + swingRect.width / 2; // Calculate pivot point
			const pivotY = swingRect.bottom;
			const deltaXFromPivot = clientX - pivotX; // Calculate delta from pivot
			const deltaYFromPivot = pivotY - clientY;
			const maxAngle = 30; // Maximum swing angle
			const maxPixelDistance = Math.max(
				swingRect.height * 0.5,
				swingRect.width * 0.5
			);
			const angle =
				Math.atan2(-deltaXFromPivot, deltaYFromPivot) * (180 / Math.PI);
			const clampedAngle = Math.max(-maxAngle, Math.min(maxAngle, angle));
			swingComponent.style.transform = `rotate(${-clampedAngle}deg)`; // Rotate swing

			const lockSoundThreshold = 4; // Degrees for lock sound
			if (
				Math.abs(clampedAngle) <= lockSoundThreshold &&
				!hasPlayedLockSound
			) {
				playSoundById("timeAdjust", 0.9 + Math.random() * 0.1); // Play lock sound
				lockSoundTimeStamps.push(performance.now()); // Record timestamp
				if (lockSoundTimeStamps.length > 4) {
					// Calculate average interval for tap tempo
					const timeDiffs = lockSoundTimeStamps
						.slice(1)
						.map(
							(timestamp, index) =>
								timestamp - lockSoundTimeStamps[index]
						);
					const averageTimeDiff =
						timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
					const newTempo = Math.round(60000 / averageTimeDiff); // Calculate new tempo
					metronome.tempo = newTempo;
					metronome.instance.style.setProperty(
						"--tempo",
						`${newTempo}`
					);
					setTempo(newTempo);
					tempoDisplay.textContent = newTempo; // Update display
					setTempoPosition(newTempo); // Set new tempo position
				}
				hasPlayedLockSound = true; // Lock sound played
			}
			if (Math.abs(clampedAngle) > lockSoundThreshold) {
				hasPlayedLockSound = false; // Reset lock sound state
			} else {
				hasPlayedLockSound = true; // Lock sound condition met
			}
		}

		if (e.type === "touchmove") {
			e.preventDefault(); // Prevent default touch behavior
		}
	}
}

// End dragging and reset UI
function stopDragging() {
	if (isDragging) {
		isDragging = false; // Reset dragging state
		tempoAdjustComponent.style.cursor = "grab"; // Reset cursor
		tempoSwingInstance.style.cursor = "grab"; // Reset swing cursor
		tempoDisplay.style.cursor = "grab"; // Reset display cursor
		dragAttempts = 0; // Reset drag attempts
		lastDragDirection = null; // Reset last drag direction
		metronome.instance.classList.remove("dragging", "up", "down"); // Remove classes
		lastDragTime = null; // Reset last drag time
		lastTempoPosition = null; // Reset last tempo position

		if (dragType === "swing") {
			const swingRect = swingComponent.getBoundingClientRect();
			const pivotX = swingRect.left + swingRect.width / 2; // Calculate pivot point
			const pivotY = swingRect.bottom;
			const deltaXFromPivot = currentX - pivotX;
			const deltaYFromPivot = pivotY - currentY;
			lockSoundTimeStamps = []; // Clear lock sound timestamps
			const angle =
				Math.atan2(-deltaXFromPivot, deltaYFromPivot) * (180 / Math.PI);
			if (Math.abs(angle) <= 2) {
				stopMetronome(); // Stop metronome if nearly centered
				metronome.playing = false; // Update playing state
				metronome.instance.classList.remove("swinging"); // Remove swinging class
				metronome.instance.classList.remove("swinging-left");
				swingComponent.style.transform = `rotate(0deg)`; // Reset swing position
			} else {
				startMetronomeWithSwing(); // Start metronome with swing
			}
		} else if (dragType === "tempo" || dragType === "precise-tempo") {
			if (metronome.playing) {
				stopMetronome(); // Stop metronome if playing
				startMetronomeWithSwing(); // Restart with swing
			}
			if (dragType === "precise-tempo") {
				metronome.instance.classList.remove("precise-dragging"); // Remove precise dragging class
			}
		}
		dragType = null; // Reset drag type
		hasPlayedLockSound = false; // Reset lock sound state
	}
}

// Start metronome with swing animation
function startMetronomeWithSwing() {
	if (!metronome.playing) {
		metronome.playing = true; // Set playing state to true

		const swingDuration = 60 / metronome.tempo; // Calculate swing duration
		metronome.instance.style.setProperty(
			"--swing-duration",
			`${swingDuration}s`
		);

		const swingRect = swingComponent.getBoundingClientRect();
		const pivotX = swingRect.left + swingRect.width / 2; // Calculate pivot point
		const pivotY = swingRect.bottom;
		const deltaXFromPivot = currentX - pivotX;
		const deltaYFromPivot = pivotY - currentY;
		const maxAngle = 30; // Maximum swing angle
		const angle =
			Math.atan2(-deltaXFromPivot, deltaYFromPivot) * (180 / Math.PI);
		let clampedAngle = -Math.max(-maxAngle, Math.min(maxAngle, angle));
		if (isNaN(clampedAngle) || clampedAngle === 0) {
			clampedAngle = 30; // Default angle if invalid
		}

		// console.log(clampedAngle);
		
		let transitionTime = 0;
		 // Calculate transition time based on current angle

		if (clampedAngle > 0) {
			 transitionTime =
				(Math.abs(clampedAngle + 30) / maxAngle) * swingDuration; // Calculate transition time
			swingComponent.style.transition = `transform ${
				transitionTime / 2
			}s ease-in-out`; // Set transition

			swingComponent.style.transform = `rotate(${-30}deg)`; // Rotate swing to start position
		} else {
			 transitionTime =
				(Math.abs(clampedAngle -30) / maxAngle) * swingDuration; // Calculate transition time
			swingComponent.style.transition = `transform ${
				transitionTime / 2
			}s ease-in-out`; // Set transition

			swingComponent.style.transform = `rotate(${30}deg)`; // Rotate swing to start position
		}

		setTimeout(() => {
			startMetronome({
				bpm: metronome.tempo,
				timeSignature: `${metronome.stress}/4`,
			}); // Start metronome
		}, transitionTime * 500 - swingDuration * 500); // Delay for metronome start

		setTimeout(() => {
			metronome.instance.classList.add("swinging");
			if (clampedAngle < 0) metronome.instance.classList.add("swinging-left"); // Add swinging class
			swingComponent.style.transition = ""; // Reset transition
		}, transitionTime * 500); // Delay for swing animation
	}
}

// Smoothly stop metronome and swing animation
function stopMetronomeAndSwing() {
	if (metronome.playing) {
		metronome.playing = false; // Set playing state to false

		const clampedAngle = getClampedSwingAngle(); // Get current clamped angle

		metronome.instance.classList.remove("swinging"); // Remove swinging class
		metronome.instance.classList.remove("swinging-left"); // Remove swinging-left class
		swingComponent.style.transform = `rotate(${clampedAngle}deg)`; // Set swing to current angle
		setTimeout(() => {
			swingComponent.style.transition = `transform 0.5s ease-in-out`; // Set transition
			swingComponent.style.transform = `rotate(0deg)`; // Reset swing position
		}, 1); // Small delay for smooth transition

		stopMetronome(); // Stop the metronome
	}
}

// Get the current clamped angle of the swing animation
function getClampedSwingAngle() {
	if (
		!metronome.playing ||
		!metronome.instance.classList.contains("swinging")
	) {
		const swingComponent = document.querySelector(".metronome-body .swing");
		const style = window.getComputedStyle(swingComponent);
		const transform = style.transform || style.webkitTransform; // Get current transform
		if (transform === "none") return 0; // Return 0 if no transform
		const matrix = transform.match(/matrix\((.+)\)/);
		if (!matrix) return 0; // Return 0 if matrix not found
		const values = matrix[1].split(", ");
		const a = parseFloat(values[0]); // Get matrix values
		const b = parseFloat(values[1]);
		let angle = Math.round(Math.atan2(b, a) * (180 / Math.PI)); // Calculate angle
		return Math.max(-30, Math.min(30, angle)); // Clamp angle
	}

	const swingComponent = document.querySelector(".metronome-body .swing");
	const style = window.getComputedStyle(metronome.instance);
	const swingDuration =
		parseFloat(style.getPropertyValue("--swing-duration")) * 1000; // Get swing duration

	const currentTime = performance.now();
	const animationProgress =
		(currentTime % (swingDuration * 2)) / (swingDuration * 2); // Calculate animation progress

	let angle;
	if (animationProgress <= 0.5) {
		angle = -30 + (animationProgress / 0.5) * (30 - -30); // Calculate angle for first half
	} else {
		angle = 30 - ((animationProgress - 0.5) / 0.5) * (30 - -30); // Calculate angle for second half
	}

	return Math.max(-30, Math.min(30, angle)); // Clamp angle
}

// Begin dragging for time signature adjustment
function startTimeSignatureDragging(e) {
	if (!metronome.playing && !isDragging) {
		isDraggingTimeSignature = true; // Set dragging state
		timeCurrentX =
			e.type === "touchstart" ? e.touches[0].clientX : e.clientX; // Get current X position
		timeDragAttempts = 0; // Reset drag attempts
		lastTimeDragDirection = null; // Reset last drag direction
		previousStress = metronome.stress; // Store previous stress
		timeSignatureAdjuster.instance.style.cursor = "grabbing"; // Change cursor
		timeSignatureAdjuster.instance.classList.add("dragging"); // Add dragging class
		if (e.type === "touchstart") {
			e.preventDefault(); // Prevent default touch behavior
		}
	}
}

// Handle dragging for time signature adjustment
function dragTimeSignature(e) {
	if (isDraggingTimeSignature) {
		const clientX =
			e.type === "touchmove" ? e.touches[0].clientX : e.clientX; // Get current X position
		const deltaX = clientX - timeCurrentX; // Calculate horizontal movement
		const currentIndex = timeSignatureValues.indexOf(metronome.stress);
		let newIndex = currentIndex; // Initialize new index

		const currentTimeDragDirection = deltaX > 0 ? "right" : "left"; // Determine drag direction

		if (Math.abs(deltaX) >= pixelThreshold) {
			// Check if movement exceeds threshold
			if (deltaX > 0 && currentIndex < timeSignatureValues.length - 1) {
				newIndex = currentIndex + 1; // Move right
			} else if (deltaX < 0 && currentIndex > 0) {
				newIndex = currentIndex - 1; // Move left
			}
			timeCurrentX = clientX; // Update current X position
		}

		if (newIndex !== currentIndex) {
			metronome.stress = timeSignatureValues[newIndex]; // Update stress
			const percent = newIndex * positionStep; // Calculate new position
			metronome.instance.style.setProperty(
				"--time-signature-position",
				`${percent}%`
			);
			updateBeatsDisplay(); // Update beats display
			playSoundById("timeAdjust", 1.0); // Play sound on adjustment
		}

		const currentNumber = document.querySelector(
			`#time-signature-${timeSignatureValues[currentIndex]}`
		);
		const newNumber = document.querySelector(
			`#time-signature-${timeSignatureValues[newIndex]}`
		);
		if (currentNumber) currentNumber.classList.remove("highlight"); // Remove highlight from current
		if (newNumber) newNumber.classList.add("highlight"); // Highlight new

		if (e.type === "touchmove") {
			e.preventDefault(); // Prevent default touch behavior
		}
	}
}

// End time signature dragging and reset UI
function stopTimeSignatureDragging() {
	if (isDraggingTimeSignature) {
		isDraggingTimeSignature = false; // Reset dragging state
		timeSignatureAdjuster.instance.style.cursor = "grab"; // Reset cursor
		timeDragAttempts = 0; // Reset drag attempts
		lastTimeDragDirection = null; // Reset last drag direction
		timeSignatureAdjuster.instance.classList.remove("dragging"); // Remove dragging class
	}
}

// Flash background color on tick if enabled
function exeOnTick(data) {
	if (preferences.flash.enable) {
		const flashColor = preferences.flash.colors[data.level] || "gray"; // Get flash color
		metronome.instance.style.backgroundColor = flashColor; // Flash background color
		setTimeout(() => {
			metronome.instance.style.backgroundColor = ""; // Reset background color
		}, 10); // Duration for flash
	}

	// Highlight the current beat
	if (beatsElement) {
		const beats = beatsElement.querySelectorAll(".beat");
		beats.forEach((beat, index) => {
			beat.classList.remove("light-up");
			beats[data.beatInMeasure].classList.add("light-up");
		});
	}
}

// Handle keyboard controls for tempo and time signature
function handleKeyboard(e) {
	const reverseVertical = preferences.keyboard.arrowKeys.reverse.vertical; // Check vertical reversal
	const reverseHorizontal = preferences.keyboard.arrowKeys.reverse.horizontal; // Check horizontal reversal

	switch (e.key) {
		case "ArrowUp":
			metronome.tempo = Math.min(
				208,
				metronome.tempo + (reverseVertical ? -1 : 1)
			); // Adjust tempo up
			updateTempo(); // Update tempo display
			break;
		case "ArrowDown":
			metronome.tempo = Math.max(
				40,
				metronome.tempo + (reverseVertical ? 1 : -1)
			); // Adjust tempo down
			updateTempo(); // Update tempo display
			break;
		case "ArrowLeft":
			adjustTimeSignature(reverseHorizontal ? 1 : -1); // Adjust time signature left/right
			break;
		case "ArrowRight":
			adjustTimeSignature(reverseHorizontal ? -1 : 1); // Adjust time signature right/left
			break;
		case " ":
			e.preventDefault(); // Prevent default space behavior
			toggleMetronome(); // Toggle metronome on/off
			break;
		case "t":
		case "T":
			tapTempo(); // Activate tap tempo
			break;
	}
}

// Update tempo display and UI
function updateTempo() {
	setTempo(metronome.tempo);
	tempoDisplay.textContent = `${metronome.tempo}`; // Update display
	setTempoPosition(metronome.tempo); // Update tempo position
	playSoundById("tempoAdjust", 1.0); // Play sound on adjustment
	if (metronome.playing) {
		stopMetronomeAndSwing(); // Stop metronome if playing
	}
}

let timeSignatureTimeout;

// Adjust time signature by direction (-1 or 1)
function adjustTimeSignature(direction) {
	const currentIndex = timeSignatureValues.indexOf(metronome.stress);
	let newIndex = currentIndex + direction; // Calculate new index
	newIndex = Math.max(0, Math.min(timeSignatureValues.length - 1, newIndex)); // Clamp new index
	if (newIndex !== currentIndex) {
		metronome.stress = timeSignatureValues[newIndex]; // Update stress
		const percent = newIndex * positionStep; // Calculate new position
		metronome.instance.style.setProperty(
			"--time-signature-position",
			`${percent}%`
		);
		updateBeatsDisplay(); // Update beats display
		playSoundById("timeAdjust", 1.0); // Play sound on adjustment
		const currentNumber = document.querySelector(
			`#time-signature-${timeSignatureValues[currentIndex]}`
		);
		const newNumber = document.querySelector(
			`#time-signature-${timeSignatureValues[newIndex]}`
		);
		if (currentNumber) currentNumber.classList.remove("highlight"); // Remove highlight from current
		if (newNumber) newNumber.classList.add("highlight"); // Highlight new
		if (metronome.playing) {
			stopMetronomeAndSwing(); // Stop metronome if playing
		}
	}
	// Show time signature adjuster UI
	timeSignatureAdjuster.instance.classList.add("show");

	clearTimeout(timeSignatureTimeout); // Clear previous timeout
	timeSignatureTimeout = setTimeout(() => {
		timeSignatureAdjuster.instance.classList.remove("show"); // Hide adjuster UI
	}, 1000); // Duration for showing adjuster
}

// Toggle metronome on/off
function toggleMetronome() {
	if (metronome.playing) {
		stopMetronomeAndSwing(); // Stop metronome if playing
	} else {
		startMetronomeWithSwing(); // Start metronome with swing
	}
}

let lockSoundTimeout;

// Tap tempo functionality
function tapTempo() {
	if (!metronome.playing) {
		const now = performance.now();
		playSoundById("timeAdjust", 0.9 + Math.random() * 0.1); // Play sound on tap
		lockSoundTimeStamps.push(now); // Record timestamp
		if (lockSoundTimeStamps.length > 4) {
			const timeDiffs = lockSoundTimeStamps
				.slice(1)
				.map(
					(timestamp, index) => timestamp - lockSoundTimeStamps[index]
				);
			const averageTimeDiff =
				timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length; // Calculate average time difference
			const newTempo = Math.round(60000 / averageTimeDiff); // Calculate new tempo
			metronome.tempo = Math.max(40, Math.min(208, newTempo)); // Clamp new tempo
			tempoDisplay.textContent = metronome.tempo; // Update display
			setTempoPosition(metronome.tempo); // Set new tempo position
		}
		if (lockSoundTimeStamps.length > 10) {
			lockSoundTimeStamps = lockSoundTimeStamps.slice(-10); // Limit timestamps
			clearTimeout(lockSoundTimeout);
			lockSoundTimeout = setTimeout(() => {
				lockSoundTimeStamps = []; // Reset timestamps after delay
			}, 5000); // Duration for reset
		}
	}
}

function setTempo(tempo) {
	metronome.tempo = tempo;
	tempoDisplay.textContent = metronome.tempo;
	setTempoPosition(metronome.tempo);
}
