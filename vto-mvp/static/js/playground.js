// ── State ─────────────────────────────────────────────────────────────────────
let currentMode = 'text-to-image';
let referenceImageBase64 = null;
let maskImageBase64 = null;
let styleImageBase64 = null;
let generatedImageBase64 = null;
let progressInterval = null;
let progressStart = null;

// ── Mode Config ───────────────────────────────────────────────────────────────
const modeConfig = {
    'text-to-image': {
        description: 'Generate images from text descriptions',
        sourceImageRequired: false,
        sourceImageTitle: 'Reference Image (Optional)',
        sourceImageHint: 'This image will be sent along with your prompt',
        showMask: false,
        showStyle: false,
        promptPlaceholder: 'Describe what you want to generate...\nExample: A serene mountain landscape at sunset with vibrant orange and purple clouds',
        templates: [
            'A photorealistic portrait of a person in soft studio lighting',
            'Abstract digital art with neon colors and geometric shapes',
            'A cozy coffee shop interior in the morning, warm light',
            'Fantasy landscape with floating islands and waterfalls',
            'Product photo of a minimalist watch on white background'
        ]
    },
    'image-editing': {
        description: 'Modify an existing image using text instructions',
        sourceImageRequired: true,
        sourceImageTitle: 'Source Image',
        sourceImageHint: 'The image you want to edit',
        showMask: false,
        showStyle: false,
        promptPlaceholder: 'Describe what changes you want to make...\nExample: Change the sky to a starry night, add a rainbow, make the colors more vibrant',
        templates: [
            'Change the background to a tropical beach at sunset',
            'Add dramatic storm clouds to the sky',
            'Make the lighting golden hour, warm tones',
            'Convert to black and white with high contrast',
            'Remove all text and logos, keep the scene'
        ]
    },
    'style-transfer': {
        description: 'Apply the style of one image to another',
        sourceImageRequired: true,
        sourceImageTitle: 'Content Image',
        sourceImageHint: 'The image whose content will be preserved',
        showMask: false,
        showStyle: true,
        promptPlaceholder: 'Describe the style transformation...\nExample: Transform this into a watercolor painting, apply the artistic style from the reference',
        templates: [
            'Apply the painterly watercolor style to my photo',
            'Transform into a pencil sketch with hatching',
            'Apply the impressionist painting style',
            'Make it look like a vintage oil painting',
            'Apply a cyberpunk neon aesthetic'
        ]
    },
    'inpainting': {
        description: 'Edit specific areas of an image using a mask',
        sourceImageRequired: true,
        sourceImageTitle: 'Source Image',
        sourceImageHint: 'The original image to edit',
        showMask: true,
        showStyle: false,
        promptPlaceholder: 'Describe what to put in the masked area...\nExample: Replace with a beautiful garden, add a cat sitting there, remove the object',
        templates: [
            'Fill with a realistic continuation of the surroundings',
            'Place a cute puppy in this area',
            'Add beautiful flowers growing here',
            'Replace with blue sky and clouds',
            'Fill with grass and nature matching the scene'
        ]
    },
    'outpainting': {
        description: 'Extend an image beyond its original borders',
        sourceImageRequired: true,
        sourceImageTitle: 'Source Image',
        sourceImageHint: 'The image to extend',
        showMask: true,
        showStyle: false,
        promptPlaceholder: 'Describe what should appear in the extended area...\nExample: Continue the landscape, add more sky above, extend the room to the left',
        templates: [
            'Continue the landscape naturally in all directions',
            'Extend the room to show more interior',
            'Add more sky with clouds above',
            'Expand to reveal a wider street scene',
            'Continue the forest into the distance'
        ]
    }
};

// ── DOM Elements ──────────────────────────────────────────────────────────────
const promptInput          = document.getElementById('promptInput');
const imageInput           = document.getElementById('imageInput');
const imageUploadArea      = document.getElementById('imageUploadArea');
const uploadPlaceholder    = document.getElementById('uploadPlaceholder');
const imagePreviewContainer= document.getElementById('imagePreviewContainer');
const imagePreview         = document.getElementById('imagePreview');
const removeImageBtn       = document.getElementById('removeImageBtn');
const generateBtn          = document.getElementById('generateBtn');
const generateBtnText      = document.getElementById('generateBtnText');
const generateBtnLoading   = document.getElementById('generateBtnLoading');
const outputPlaceholder    = document.getElementById('outputPlaceholder');
const outputLoading        = document.getElementById('outputLoading');
const outputResult         = document.getElementById('outputResult');
const outputError          = document.getElementById('outputError');
const outputActions        = document.getElementById('outputActions');
const generatedImage       = document.getElementById('generatedImage');
const downloadBtn          = document.getElementById('downloadBtn');
const expandBtn            = document.getElementById('expandBtn');
const errorText            = document.getElementById('errorText');
const settingsToggle       = document.getElementById('settingsToggle');
const settingsPanel        = document.getElementById('settingsPanel');
const settingsArrow        = document.getElementById('settingsArrow');
const modelSelect          = document.getElementById('modelSelect');
const aspectRatioSelect    = document.getElementById('aspectRatioSelect');
const imageSizeSelect      = document.getElementById('imageSizeSelect');
const temperatureSlider    = document.getElementById('temperatureSlider');
const temperatureValue     = document.getElementById('temperatureValue');
const seedInput            = document.getElementById('seedInput');
const randomSeedBtn        = document.getElementById('randomSeedBtn');
const negativePromptToggle = document.getElementById('negativePromptToggle');
const negativePromptInput  = document.getElementById('negativePromptInput');
const optimizeBtn          = document.getElementById('optimizeBtn');
const promptTemplates      = document.getElementById('promptTemplates');
const modeTabs             = document.querySelectorAll('.mode-tab');
const modeDescription      = document.getElementById('modeDescription');
const sourceImageSection   = document.getElementById('sourceImageSection');
const sourceImageTitle     = document.getElementById('sourceImageTitle');
const uploadPlaceholderHint= document.getElementById('uploadPlaceholderHint');
const maskImageSection     = document.getElementById('maskImageSection');
const maskUploadArea       = document.getElementById('maskUploadArea');
const maskInput            = document.getElementById('maskInput');
const maskPlaceholder      = document.getElementById('maskPlaceholder');
const maskPreviewContainer = document.getElementById('maskPreviewContainer');
const maskPreview          = document.getElementById('maskPreview');
const removeMaskBtn        = document.getElementById('removeMaskBtn');
const styleImageSection    = document.getElementById('styleImageSection');
const styleUploadArea      = document.getElementById('styleUploadArea');
const styleInput           = document.getElementById('styleInput');
const stylePlaceholder     = document.getElementById('stylePlaceholder');
const stylePreviewContainer= document.getElementById('stylePreviewContainer');
const stylePreview         = document.getElementById('stylePreview');
const removeStyleBtn       = document.getElementById('removeStyleBtn');
const galleryGrid          = document.getElementById('galleryGrid');
const clearHistoryBtn      = document.getElementById('clearHistoryBtn');
const progressFill         = document.getElementById('progressFill');
const progressTimer        = document.getElementById('progressTimer');
const progressStatus       = document.getElementById('progressStatus');

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadSettingsFromStorage();
    updateUIForMode();
    loadHistory();
});

// ── Event Listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
    // Mode tabs
    modeTabs.forEach(tab => {
        tab.onclick = () => {
            if (tab.dataset.mode !== currentMode) setMode(tab.dataset.mode);
        };
    });

    // Settings toggle
    settingsToggle.onclick = toggleSettings;

    // Settings save on change
    modelSelect.onchange      = () => { validateImageSize(); saveSettingsToStorage(); };
    aspectRatioSelect.onchange = saveSettingsToStorage;
    imageSizeSelect.onchange  = () => { validateImageSize(); saveSettingsToStorage(); };

    // Temperature slider live update
    temperatureSlider.oninput = () => {
        temperatureValue.textContent = parseFloat(temperatureSlider.value).toFixed(1);
        saveSettingsToStorage();
    };

    // Random seed button
    randomSeedBtn.onclick = () => {
        seedInput.value = Math.floor(Math.random() * 2147483647);
        saveSettingsToStorage();
    };
    seedInput.oninput = saveSettingsToStorage;

    // Negative prompt toggle
    negativePromptToggle.onclick = () => {
        const visible = negativePromptInput.style.display !== 'none';
        negativePromptInput.style.display = visible ? 'none' : 'block';
        negativePromptToggle.classList.toggle('active', !visible);
        if (!visible) negativePromptInput.focus();
    };

    // Optimize prompt button
    optimizeBtn.onclick = optimizePrompt;

    // Source image upload
    setupImageUpload(
        imageUploadArea, imageInput, imagePreviewContainer, imagePreview, uploadPlaceholder,
        (b64) => { referenceImageBase64 = b64; },
        () => referenceImageBase64
    );
    removeImageBtn.onclick = (e) => { e.stopPropagation(); removeImage('source'); };

    // Mask image upload
    setupImageUpload(
        maskUploadArea, maskInput, maskPreviewContainer, maskPreview, maskPlaceholder,
        (b64) => { maskImageBase64 = b64; },
        () => maskImageBase64
    );
    removeMaskBtn.onclick = (e) => { e.stopPropagation(); removeImage('mask'); };

    // Style image upload
    setupImageUpload(
        styleUploadArea, styleInput, stylePreviewContainer, stylePreview, stylePlaceholder,
        (b64) => { styleImageBase64 = b64; },
        () => styleImageBase64
    );
    removeStyleBtn.onclick = (e) => { e.stopPropagation(); removeImage('style'); };

    // Generate
    generateBtn.onclick = generate;
    promptInput.onkeydown = (e) => { if (e.ctrlKey && e.key === 'Enter') generate(); };

    // Download
    downloadBtn.onclick = downloadImage;

    // Expand / fullscreen
    expandBtn.onclick = () => {
        if (generatedImageBase64) {
            openLightbox(generatedImageBase64, `nanobanana-${currentMode}.png`);
        }
    };

    // Click generated image to expand
    generatedImage.onclick = () => {
        if (generatedImageBase64) openLightbox(generatedImageBase64, `nanobanana-${currentMode}.png`);
    };

    // History clear
    clearHistoryBtn.onclick = clearHistory;
}

// ── Image Upload Helper ───────────────────────────────────────────────────────
function setupImageUpload(uploadArea, input, previewContainer, preview, placeholder, setBase64, getBase64) {
    uploadArea.onclick = (e) => {
        if (!previewContainer.contains(e.target) || e.target === uploadArea) {
            if (!getBase64()) input.click();
        }
    };

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file, preview, previewContainer, placeholder, setBase64);
    };

    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('drag-over');
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
        showToast('File size must be less than 10MB', 'error');
        return;
    }
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
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

// ── Mode ──────────────────────────────────────────────────────────────────────
function setMode(mode) {
    currentMode = mode;
    modeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));
    updateUIForMode();
    saveSettingsToStorage();
}

function updateUIForMode() {
    const config = modeConfig[currentMode];

    modeDescription.textContent = config.description;
    promptInput.placeholder = config.promptPlaceholder;

    sourceImageTitle.innerHTML = config.sourceImageTitle +
        (config.sourceImageRequired ? ' <span class="required-badge">Required</span>' : '');
    uploadPlaceholderHint.textContent = config.sourceImageHint;

    maskImageSection.style.display  = config.showMask  ? 'block' : 'none';
    styleImageSection.style.display = config.showStyle ? 'block' : 'none';

    renderTemplates(config.templates);
}

function renderTemplates(templates) {
    promptTemplates.innerHTML = '';
    templates.forEach(tpl => {
        const chip = document.createElement('button');
        chip.className = 'template-chip';
        chip.textContent = tpl.length > 50 ? tpl.slice(0, 47) + '...' : tpl;
        chip.title = tpl;
        chip.onclick = () => {
            promptInput.value = tpl;
            promptInput.focus();
            showToast('Template applied', 'info', 2000);
        };
        promptTemplates.appendChild(chip);
    });
}

// ── Settings ──────────────────────────────────────────────────────────────────
function toggleSettings() {
    const expanded = settingsPanel.classList.toggle('expanded');
    settingsArrow.classList.toggle('expanded', expanded);
}

function validateImageSize() {
    if (imageSizeSelect.value === '4K' && modelSelect.value !== 'gemini-3-pro-image-preview') {
        imageSizeSelect.value = '2K';
        showToast('4K is only available with NanoBanana Pro. Switched to 2K.', 'warning');
    }
}

function getSettings() {
    return {
        model:        modelSelect.value,
        aspect_ratio: aspectRatioSelect.value || null,
        image_size:   imageSizeSelect.value   || null,
        temperature:  parseFloat(temperatureSlider.value),
        seed:         seedInput.value ? parseInt(seedInput.value) : null,
        negative_prompt: negativePromptInput.value.trim() || null
    };
}

function saveSettingsToStorage() {
    const s = getSettings();
    localStorage.setItem('playground_settings', JSON.stringify({ ...s, mode: currentMode }));
}

function loadSettingsFromStorage() {
    try {
        const saved = localStorage.getItem('playground_settings');
        if (!saved) return;
        const s = JSON.parse(saved);
        if (s.model)        modelSelect.value        = s.model;
        if (s.aspect_ratio) aspectRatioSelect.value  = s.aspect_ratio;
        if (s.image_size)   imageSizeSelect.value    = s.image_size;
        if (s.temperature != null) {
            temperatureSlider.value  = s.temperature;
            temperatureValue.textContent = parseFloat(s.temperature).toFixed(1);
        }
        if (s.seed)         seedInput.value          = s.seed;
        if (s.mode && modeConfig[s.mode]) {
            currentMode = s.mode;
            modeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === currentMode));
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

// ── Prompt Optimizer ──────────────────────────────────────────────────────────
async function optimizePrompt() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
        showToast('Enter a prompt first', 'warning');
        promptInput.focus();
        return;
    }

    optimizeBtn.disabled = true;
    optimizeBtn.textContent = 'Optimizing...';

    try {
        const response = await fetch('/optimize-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, mode: currentMode })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to optimize');

        promptInput.value = data.optimized_prompt;
        showToast('Prompt optimized! ✨', 'success');
    } catch (error) {
        showToast('Failed to optimize prompt: ' + error.message, 'error');
    } finally {
        optimizeBtn.disabled = false;
        optimizeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Optimize`;
    }
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function startProgress() {
    progressStart = Date.now();
    let pct = 0;

    const statuses = [
        'NanoBanana is working...',
        'Processing your prompt...',
        'Generating pixels...',
        'Adding details...',
        'Almost there...'
    ];
    let statusIdx = 0;

    progressFill.style.width = '0%';
    if (progressTimer) progressTimer.textContent = '0s';
    if (progressStatus) progressStatus.textContent = statuses[0];

    progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - progressStart) / 1000);
        if (progressTimer) progressTimer.textContent = elapsed + 's';

        // Asymptotic approach to 90%
        pct = 90 * (1 - Math.exp(-elapsed / 25));
        progressFill.style.width = pct.toFixed(1) + '%';

        // Cycle through status messages
        const newIdx = Math.min(Math.floor(elapsed / 6), statuses.length - 1);
        if (newIdx !== statusIdx && progressStatus) {
            statusIdx = newIdx;
            progressStatus.textContent = statuses[statusIdx];
        }
    }, 500);
}

function stopProgress() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    progressFill.style.width = '100%';
}

// ── Generate ──────────────────────────────────────────────────────────────────
async function generate() {
    const prompt = promptInput.value.trim();
    const config = modeConfig[currentMode];

    if (!prompt) {
        showToast('Please enter a prompt', 'warning');
        promptInput.focus();
        return;
    }
    if (config.sourceImageRequired && !referenceImageBase64) {
        showToast('Please upload a source image for this mode', 'warning');
        return;
    }
    if (config.showMask && !maskImageBase64) {
        showToast('Please upload a mask image for this mode', 'warning');
        return;
    }
    if (config.showStyle && !styleImageBase64) {
        showToast('Please upload a style reference image for this mode', 'warning');
        return;
    }

    showOutputState('loading');
    setGenerateButtonLoading(true);
    startProgress();

    try {
        const settings = getSettings();
        const requestBody = { prompt, mode: currentMode, ...settings };

        if (referenceImageBase64) requestBody.image = referenceImageBase64;
        if (maskImageBase64 && config.showMask) requestBody.mask = maskImageBase64;
        if (styleImageBase64 && config.showStyle) requestBody.style_image = styleImageBase64;

        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to generate image');

        if (data.success) {
            generatedImageBase64 = data.generated_image;
            generatedImage.src = generatedImageBase64;
            showOutputState('result');
            showToast('Image generated!', 'success');
            loadHistory();
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Generate error:', error);
        errorText.textContent = error.message;
        showOutputState('error');
        showToast('Generation failed: ' + error.message, 'error');
    } finally {
        stopProgress();
        setGenerateButtonLoading(false);
    }
}

function showOutputState(state) {
    outputPlaceholder.style.display = 'none';
    outputLoading.style.display     = 'none';
    outputResult.style.display      = 'none';
    outputError.style.display       = 'none';
    outputActions.style.display     = 'none';

    switch (state) {
        case 'placeholder': outputPlaceholder.style.display = 'flex'; break;
        case 'loading':     outputLoading.style.display     = 'flex'; break;
        case 'result':
            outputResult.style.display  = 'block';
            outputActions.style.display = 'flex';
            break;
        case 'error':       outputError.style.display       = 'flex'; break;
    }
}

function setGenerateButtonLoading(loading) {
    generateBtn.disabled = loading;
    generateBtnText.style.display    = loading ? 'none'        : 'inline';
    generateBtnLoading.style.display = loading ? 'inline-flex' : 'none';
}

// ── Download ──────────────────────────────────────────────────────────────────
function downloadImage() {
    if (!generatedImageBase64) return;
    const a = document.createElement('a');
    a.href = generatedImageBase64;
    a.download = `nanobanana-${currentMode}-${Date.now()}.png`;
    a.click();
    showToast('Image downloaded!', 'success');
}

// ── History ───────────────────────────────────────────────────────────────────
async function loadHistory() {
    try {
        const response = await fetch('/history');
        if (!response.ok) return;
        const history = await response.json();
        renderHistory(history);
    } catch (e) {
        console.error('Failed to load history:', e);
    }
}

function renderHistory(history) {
    if (!history || history.length === 0) {
        galleryGrid.innerHTML = '<span class="gallery-empty">No generations yet</span>';
        return;
    }

    galleryGrid.innerHTML = '';
    history.forEach(entry => {
        const thumb = document.createElement('div');
        thumb.className = 'gallery-thumb';
        thumb.title = entry.prompt || entry.mode;
        thumb.innerHTML = `<img src="${entry.image}" alt="${entry.mode}" loading="lazy">`;
        thumb.onclick = () => openLightbox(entry.image, `nanobanana-${entry.mode}.png`);
        galleryGrid.appendChild(thumb);
    });
}

async function clearHistory() {
    try {
        await fetch('/history', { method: 'DELETE' });
        galleryGrid.innerHTML = '<span class="gallery-empty">No generations yet</span>';
        showToast('History cleared', 'info', 2000);
    } catch (e) {
        showToast('Failed to clear history', 'error');
    }
}
