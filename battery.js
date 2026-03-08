/* ============================================================================
   TITAN OS - HARDWARE ABSTRACTION LAYER (HAL)
   MODULE: POWER_KERNEL.JS (v6.60)
   AUTHOR: alvarados70
   TARGET: Chromebook OS / Mobile Android / iOS
   ============================================================================
   DESCRIPTION:
   This kernel handles all low-level hardware communication regarding power
   states. It monitors voltage levels, charging status, and dispatches 
   critical system alerts when the 10% threshold is breached.
   ============================================================================ */

/**
 * CORE POWER CONFIGURATION
 * These constants define the operational limits of the Titan OS battery engine.
 */
const SYSTEM_CONFIG = {
    CRITICAL_LEVEL: 10,          // The 10% Alert Trigger
    LOW_POWER_LEVEL: 20,        // Visual warning threshold
    UPDATE_INTERVAL: 1000,      // Hardware sync frequency (ms)
    VERSION: "6.60.2",
    KERNEL_MODE: "Production"
};

/**
 * STATE MANAGEMENT
 * Tracks current session data to prevent duplicate alert dispatching.
 */
let kernelState = {
    alertDispatched: false,
    lastKnownLevel: null,
    isCharging: false,
    sessionStartTime: Date.now()
};

/**
 * POWER KERNEL INITIALIZATION
 * Connects the Titan OS software layer to the physical device battery.
 */
async function initializeBatteryKernel() {
    console.log("%c[TITAN KERNEL]: Initializing Power Management...", "color: #39C5BB; font-weight: bold;");

    // Check for Browser Hardware Support
    if (!navigator.getBattery) {
        handleKernelPanic("BATTERY_API_NOT_FOUND");
        return;
    }

    try {
        const batteryHardware = await navigator.getBattery();

        /**
         * REFRESH SYSTEM METRICS
         * This internal function calculates levels and updates the main OS UI.
         */
        const refreshMetrics = () => {
            const currentLevel = Math.floor(batteryHardware.level * 100);
            const chargingStatus = batteryHardware.charging;
            
            // Sync state to kernel
            kernelState.lastKnownLevel = currentLevel;
            kernelState.isCharging = chargingStatus;

            // Target the Main File's UI element
            const batteryDisplay = document.getElementById('os-battery');
            
            if (batteryDisplay) {
                // Update text with hardware data
                batteryDisplay.innerText = `${currentLevel}% ${chargingStatus ? "⚡" : "🔋"}`;

                // --- CRITICAL LOGIC ENGINE ---
                if (currentLevel <= SYSTEM_CONFIG.CRITICAL_LEVEL && !chargingStatus) {
                    executeCriticalProtocol(batteryDisplay);
                } else {
                    restoreNormalProtocol(batteryDisplay, currentLevel, chargingStatus);
                }
            }
        };

        // Hardware Event Listeners (Chromebook/Phone reactive)
        batteryHardware.addEventListener('levelchange', () => {
            console.log(`[KERNEL]: Power level update -> ${Math.floor(batteryHardware.level * 100)}%`);
            refreshMetrics();
        });

        batteryHardware.addEventListener('chargingchange', () => {
            console.log(`[KERNEL]: Power source changed -> ${batteryHardware.charging ? "AC" : "DC"}`);
            refreshMetrics();
        });

        // Immediate Execution on Boot
        refreshMetrics();

    } catch (err) {
        handleKernelPanic("HARDWARE_SYNC_FAILED", err);
    }
}

/**
 * CRITICAL PROTOCOL (10% TRIGGER)
 * Handles the visual and logical state when power is critically low.
 */
function executeCriticalProtocol(uiElement) {
    // Apply visual "Alert" styling to the top bar pill
    uiElement.style.color = "#ff3366";
    uiElement.style.borderColor = "#ff3366";
    uiElement.style.boxShadow = "0 0 20px rgba(255, 51, 102, 0.7)";
    uiElement.classList.add('low-power-pulse');

    // Trigger the Global Modal in the Main File
    if (!kernelState.alertDispatched) {
        const systemModal = document.getElementById('battery-modal');
        if (systemModal) {
            systemModal.style.display = 'flex';
            kernelState.alertDispatched = true;
            console.warn("[TITAN ALERT]: 10% Threshold Reached. Dispatching Modal.");
        }
    }
}

/**
 * NORMAL OPERATION PROTOCOL
 * Restores UI and resets flags when power is stable or charging.
 */
function restoreNormalProtocol(uiElement, level, isCharging) {
    uiElement.style.color = "white";
    uiElement.style.borderColor = "rgba(57, 197, 187, 0.5)";
    uiElement.style.boxShadow = "none";
    uiElement.classList.remove('low-power-pulse');

    // Reset alert flag if charging or power rose above 10%
    if (isCharging || level > SYSTEM_CONFIG.CRITICAL_LEVEL) {
        kernelState.alertDispatched = false;
    }
}

/**
 * KERNEL PANIC HANDLER
 * Provides fallback data if the hardware prevents communication.
 */
function handleKernelPanic(reason, error = "") {
    console.error(`[KERNEL PANIC]: ${reason}`, error);
    const display = document.getElementById('os-battery');
    if (display) {
        display.innerText = "HW_ERR";
        display.style.color = "#ffcc00";
    }
}

// ----------------------------------------------------------------------------
// BOOTSTRAP EXECUTION
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main OS environment to be ready
    setTimeout(() => {
        initializeBatteryKernel();
    }, 500); 
});

/* ============================================================================
   END OF BATTERY KERNEL MODULE
   ============================================================================ */
