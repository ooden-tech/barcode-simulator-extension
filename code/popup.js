const DEFAULT_TEMPLATE = `{
  "detail": {
    "data": "INPUT_DATA"
  }
}`;

const DEFAULT_EVENT_NAMES = "onbarcode,onbarcodeinput";

let sendBarcodeButton = document.getElementById("sendBarcode");
let updateTemplateButton = document.getElementById("updateTemplate");
let resetTemplateButton = document.getElementById("resetTemplate");
let barcodeValueInput = document.getElementById("barcodeValue");
let barcodeValueTemplateInput = document.getElementById("barcodeValueTemplate");
let eventNamesInput = document.getElementById("eventNames");
let errorsElement = document.getElementById("errorsSection");

sendBarcodeButton.disabled = !barcodeValueInput.value;
barcodeValueInput.addEventListener("keyup", async () => {
  sendBarcodeButton.disabled = !barcodeValueInput.value;
});

// Set the last sent barcode value in the input
chrome.storage.sync.get(["lastBarcodeValue"], ({ lastBarcodeValue }) => {
  barcodeValueInput.value = lastBarcodeValue;
  sendBarcodeButton.disabled = !barcodeValueInput.value;
});

// Set the last updated template
chrome.storage.sync.get(["barcodeTemplate"], ({ barcodeTemplate }) => {
  if (barcodeTemplate) {
    barcodeValueTemplateInput.value = barcodeTemplate;
  } else {
    barcodeValueTemplateInput.value = DEFAULT_TEMPLATE;
  }
});

// Set the last specified event names
chrome.storage.sync.get(["eventNames"], ({ eventNames }) => {
  if (eventNames) {
    eventNamesInput.value = eventNames;
  } else {
    eventNamesInput.value = DEFAULT_EVENT_NAMES;
  }
});

// When the button is clicked, inject sendBarcode into current page
sendBarcodeButton.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  errorsElement.innerHTML = "";

  let barcodeObject = undefined;
  // Replace input data with real value
  const barcodeValueTemplate = barcodeValueTemplateInput.value.replace(
    /INPUT_DATA/g,
    barcodeValueInput.value
  );

  // TODO - read this from settings
  const dataType = "json";
  // Parse to json if needed
  if (dataType === "json") {
    try {
      barcodeObject = JSON.parse(barcodeValueTemplate);
    } catch (error) {
      errorsElement.innerHTML = "Error sending code: <br/>" + error;
      return;
    }
  } else {
    barcodeObject = barcodeValueTemplate;
  }

  // Set value into storage to be able to send event to current page
  chrome.storage.sync.set({ lastBarcodeValue: barcodeValueInput.value });
  chrome.storage.sync.set({ PARAM_barcodeObject: barcodeObject });
  chrome.storage.sync.set({ PARAM_eventNames: eventNamesInput.value });

  // Send event to current page
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: sendBarcode,
  });
});

updateTemplateButton.addEventListener("click", async () => {
  chrome.storage.sync.set({ barcodeTemplate: barcodeValueTemplateInput.value });
  chrome.storage.sync.set({ eventNames: eventNamesInput.value });
});

resetTemplateButton.addEventListener("click", async () => {
  chrome.storage.sync.set({ barcodeTemplate: DEFAULT_TEMPLATE });
  barcodeValueTemplateInput.value = DEFAULT_TEMPLATE;

  chrome.storage.sync.set({ eventNames: DEFAULT_EVENT_NAMES });
  eventNamesInput.value = DEFAULT_EVENT_NAMES;
});

// The body of this function will be executed as a content script inside the current page
function sendBarcode() {
  // Get value from storage and send event
  chrome.storage.sync.get(
    ["PARAM_barcodeObject", "PARAM_eventNames"],
    ({ PARAM_barcodeObject: barcodeObject, PARAM_eventNames: eventNames }) => {
      if (eventNames) {
        const allEvents = eventNames.split(",");

        for (let eIndex = 0; eIndex < allEvents.length; eIndex++) {
          let event = new CustomEvent(allEvents[eIndex], barcodeObject);
          window.dispatchEvent(event);
        }
      }
    }
  );
}
