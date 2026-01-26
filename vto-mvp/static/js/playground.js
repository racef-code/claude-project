// Playground state
let currentMode = 'text-to-image';
let referenceImageBase64 = null;
let maskImageBase64 = null;
let styleImageBase64 = null;
let generatedImageBase64 = null;
let settingsExpanded = false;

// Mode configurations
const modeConfig = {
    'text-to-image': {
        description: 'Generate images from text descriptions',
        sourceImageRequired: false,
        sourceImageTitle: 'Reference Image (Optional)',
        sourceImageHint: 'This image will be sent along with your prompt',
        showMask: false,
        showStyle: false,
        promptPlaceholder: 'Describe what you want to generate...\nExample: A serene mountain landscape at sunset with vibrant orange and purple clouds'
    },
    'image-editing': {
        description: 'Modify an existing image using text instructions',
        sourceImageRequired: true,
        sourceImageTitle: 'Source Image',
        sourceImageHint: 'The image you want to edit',
        showMask: false,
        showStyle: false,
        promptPlaceholder: 'Describe what changes you want to make...\nExample: Change the sky to a starry night, add a rainbow, make the colors more vibrant'
    },
    'style-transfer': {
        description: 'Apply the style of one image to another',
        sourceImageRequired: true,
        sourceImageTitle: 'Content Image',
        sourceImageHint: 'The image whose content will be preserved',
        showMask: false,
        showStyle: true,
        promptPlaceholder: 'Describe the style transformation...\nExample: Transform this into a watercolor painting, apply the artistic style from the reference'
    },
    'inpainting': {
        description: 'Edit specific areas of an image using a mask',
        sourceImageRequired: true,
        sourceImageTitle: 'Source Image',
        sourceImageHint: 'The original image to edit',
        showMask: true,
        showStyle: false,
        promptPlaceholder: 'Describe what to put in the masked area...\nExample: Replace with a beautiful garden, add a cat sitting there, remove the object'
    },
    'outpainting': {
        description: 'Extend an image beyond its original borders',
        sourceImageRequired: true,
        sourceImageTitle: 'Source Image',
        sourceImageHint: 'The image to extend',
        showMask: true,
        showStyle: false,
        promptPlaceholder: 'Describe what should appear in the extended area...\nExample: Continue the landscape, add more sky above, extend the room to the left'
    }
};

// DOM elements
const promptInput = document.getElementById('promptInput');
const imageInput = document.getElementById('imageInput');
const imageUploadArea = document.getElementById('imageUploadArea');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
const generateBtn = document.getElementById('generateBtn');
const generateBtnText = document.getElementById('generateBtnText');
const generateBtnLoading = document.getElementById('generateBtnLoading');
const outputPlaceholder = document.getElementById('outputPlaceholder');
const outputLoading = document.getElementById('outputLoading');
const outputResult = document.getElementById('outputResult');
const outputError = document.getElementById('outputError');
const outputActions = document.getElementById('outputActions');
const generatedImage = document.getElementById('generatedImage');
const downloadBtn = document.getElementById('downloadBtn');
const errorText = document.getElementById('errorText');

// Settings elements
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const settingsArrow = document.getElementById('settingsArrow');
const modelSelect = document.getElementById('modelSelect');
const aspectRatioSelect = document.getElementById('aspectRatioSelect');
const imageSizeSelect = document.getElementById('imageSizeSelect');
const googleSearchToggle = document.getElementById('googleSearchToggle');

// Mode elements
const modeTabs = document.querySelectorAll('.mode-tab');
const modeDescription = document.getElementById('modeDescription');
const sourceImageSection = document.getElementById('sourceImageSection');
const sourceImageTitle = document.getElementById('sourceImageTitle');
const uploadPlaceholderText = document.getElementById('uploadPlaceholderText');
const uploadPlaceholderHint = document.getElementById('uploadPlaceholderHint');

// Mask elements
const maskImageSection = document.getElementById('maskImageSection');
const maskUploadArea = document.getElementById('maskUploadArea');
const maskInput = document.getElementById('maskInput');
const maskPlaceholder = document.getElementById('maskPlaceholder');
const maskPreviewContainer = document.getElementById('maskPreviewContainer');
const maskPreview = document.getElementById('maskPreview');
const removeMaskBtn = document.getElementById('removeMaskBtn');

// Style elements
const styleImageSection = document.getElementById('styleImageSection');
const styleUploadArea = document.getElementById('styleUploadArea');
const styleInput = document.getElementById('styleInput');
const stylePlaceholder = document.getElementById('stylePlaceholder');
const stylePreviewContainer = document.getElementById('stylePreviewContainer');
const stylePreview = document.getElementById('stylePreview');
const removeStyleBtn = document.getElementById('removeStyleBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadSettingsFromStorage();
    updateUIForMode();
});

function setupEventListeners() {
    // Mode tabs
    modeTabs.forEach(tab => {
        tab.onclick = () => {
            const mode = tab.dataset.mode;
            if (mode !== currentMode) {
                setMode(mode);
            }
        };
    });

    // Settings toggle
    settingsToggle.onclick = toggleSettings;

    // Save settings on change
    modelSelect.onchange = () => {
        validateImageSize();
        saveSettingsToStorage();
    };
    aspectRatioSelect.onchange = saveSettingsToStorage;
    imageSizeSelect.onchange = () => {
        validateImageSize();
        saveSettingsToStorage();
    };
    googleSearchToggle.onchange = saveSettingsToStorage;

    // Source image upload
    setupImageUpload(imageUploadArea, imageInput, imagePreviewContainer, imagePreview, uploadPlaceholder,
        (base64) => { referenceImageBase64 = base64; },
        () => referenceImageBase64
    );
    removeImageBtn.onclick = (e) => {
        e.stopPropagation();
        removeImage('source');
    };

    // Mask image upload
    setupImageUpload(maskUploadArea, maskInput, maskPreviewContainer, maskPreview, maskPlaceholder,
        (base64) => { maskImageBase64 = base64; },
        () => maskImageBase64
    );
    removeMaskBtn.onclick = (e) => {
        e.stopPropagation();
        removeImage('mask');
    };

    // Style image upload
    setupImageUpload(styleUploadArea, styleInput, stylePreviewContainer, stylePreview, stylePlaceholder,
        (base64) => { styleImageBase64 = base64; },
        () => styleImageBase64
    );
    removeStyleBtn.onclick = (e) => {
        e.stopPropagation();
        removeImage('style');
    };

    // Generate button
    generateBtn.onclick = generate;

    // Download button
    downloadBtn.onclick = downloadImage;

    // Allow Ctrl+Enter to generate
    promptInput.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            generate();
        }
    };
}

function setupImageUpload(uploadArea, input, previewContainer, preview, placeholder, setBase64, getBase64) {
    uploadArea.onclick = (e) => {
        if (!previewContainer.contains(e.target) || e.target === uploadArea) {
            if (!getBase64()) {
                input.click();
            }
        }
    };

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file, preview, previewContainer, placeholder, setBase64);
        }
    };

    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    };

    uploadArea.ondragleave = () => {
        uploadArea.classList.remove('drag-over');
    };

    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileUpload(file, preview, previewContainer, placeholder, setBase64);
        }
    };
}

function handleFileUpload(file, preview, previewContainer, placeholder, setBase64) {
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        setBase64(e.target.result);
        preview.src = e.target.result;
        placeholder.style.display = 'none';
        previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeImage(type) {
    switch (type) {
        case 'source':
            referenceImageBase64 = null;
            imageInput.value = '';
            imagePreview.src = '';
            imagePreviewContainer.style.display = 'none';
            uploadPlaceholder.style.display = 'flex';
            break;
        case 'mask':
            maskImageBase64 = null;
            maskInput.value = '';
            maskPreview.src = '';
            maskPreviewContainer.style.display = 'none';
            maskPlaceholder.style.display = 'flex';
            break;
        case 'style':
            styleImageBase64 = null;
            styleInput.value = '';
            stylePreview.src = '';
            stylePreviewContainer.style.display = 'none';
            stylePlaceholder.style.display = 'flex';
            break;
    }
}

function setMode(mode) {
    currentMode = mode;

    // Update active tab
    modeTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    updateUIForMode();
    saveSettingsToStorage();
}

function updateUIForMode() {
    const config = modeConfig[currentMode];

    // Update description
    modeDescription.textContent = config.description;

    // Update prompt placeholder
    promptInput.placeholder = config.promptPlaceholder;

    // Update source image section
    sourceImageTitle.innerHTML = config.sourceImageTitle +
        (config.sourceImageRequired ? ' <span class="required-badge">Required</span>' : '');
    uploadPlaceholderHint.textContent = config.sourceImageHint;

    // Show/hide mask section
    maskImageSection.style.display = config.showMask ? 'block' : 'none';

    // Show/hide style section
    styleImageSection.style.display = config.showStyle ? 'block' : 'none';
}

function toggleSettings() {
    settingsExpanded = !settingsExpanded;
    settingsPanel.classList.toggle('expanded', settingsExpanded);
    settingsArrow.classList.toggle('expanded', settingsExpanded);
}

function validateImageSize() {
    const model = modelSelect.value;
    const size = imageSizeSelect.value;

    if (size === '4K' && model !== 'gemini-3-pro-image-preview') {
        imageSizeSelect.value = '2K';
        alert('4K resolution is only available with Gemini 3 Pro model. Switched to 2K.');
    }
}

function getSettings() {
    return {
        model: modelSelect.value,
        aspect_ratio: aspectRatioSelect.value || null,
        image_size: imageSizeSelect.value || null,
        google_search: googleSearchToggle.checked
    };
}

function saveSettingsToStorage() {
    const settings = {
        ...getSettings(),
        mode: currentMode
    };
    localStorage.setItem('playground_settings', JSON.stringify(settings));
}

function loadSettingsFromStorage() {
    try {
        const saved = localStorage.getItem('playground_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (settings.model) modelSelect.value = settings.model;
            if (settings.aspect_ratio) aspectRatioSelect.value = settings.aspect_ratio;
            if (settings.image_size) imageSizeSelect.value = settings.image_size;
            if (settings.google_search) googleSearchToggle.checked = settings.google_search;
            if (settings.mode && modeConfig[settings.mode]) {
                currentMode = settings.mode;
                modeTabs.forEach(tab => {
                    tab.classList.toggle('active', tab.dataset.mode === currentMode);
                });
            }
        }
    } catch (e) {
        console.error('Failed to load settings from storage:', e);
    }
}

async function generate() {
    const prompt = promptInput.value.trim();
    const config = modeConfig[currentMode];

    // Validation
    if (!prompt) {
        alert('Please enter a prompt');
        promptInput.focus();
        return;
    }

    if (config.sourceImageRequired && !referenceImageBase64) {
        alert('Please upload a source image for this mode');
        return;
    }

    if (config.showMask && !maskImageBase64) {
        alert('Please upload a mask image for this mode');
        return;
    }

    if (config.showStyle && !styleImageBase64) {
        alert('Please upload a style reference image for this mode');
        return;
    }

    console.log(`Starting ${currentMode} generation...`);
    showOutputState('loading');
    setGenerateButtonLoading(true);

    try {
        const settings = getSettings();
        const requestBody = {
            prompt,
            mode: currentMode,
            ...settings
        };

        // Add images based on mode
        if (referenceImageBase64) {
            requestBody.image = referenceImageBase64;
        }

        if (maskImageBase64 && config.showMask) {
            requestBody.mask = maskImageBase64;
        }

        if (styleImageBase64 && config.showStyle) {
            requestBody.style_image = styleImageBase64;
        }

        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate image');
        }

        if (data.success) {
            console.log('Image generated successfully');
            generatedImageBase64 = data.generated_image;
            generatedImage.src = generatedImageBase64;
            showOutputState('result');
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error generating image:', error);
        showError(error.message);
    } finally {
        setGenerateButtonLoading(false);
    }
}

function showOutputState(state) {
    outputPlaceholder.style.display = 'none';
    outputLoading.style.display = 'none';
    outputResult.style.display = 'none';
    outputError.style.display = 'none';
    outputActions.style.display = 'none';

    switch (state) {
        case 'placeholder':
            outputPlaceholder.style.display = 'flex';
            break;
        case 'loading':
            outputLoading.style.display = 'flex';
            break;
        case 'result':
            outputResult.style.display = 'block';
            outputActions.style.display = 'flex';
            break;
        case 'error':
            outputError.style.display = 'flex';
            break;
    }
}

function showError(message) {
    errorText.textContent = message;
    showOutputState('error');
}

function setGenerateButtonLoading(loading) {
    generateBtn.disabled = loading;
    generateBtnText.style.display = loading ? 'none' : 'inline';
    generateBtnLoading.style.display = loading ? 'inline-flex' : 'none';
}

function downloadImage() {
    if (!generatedImageBase64) {
        return;
    }

    const link = document.createElement('a');
    link.href = generatedImageBase64;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `nanobanana-${currentMode}-${timestamp}.jpg`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
