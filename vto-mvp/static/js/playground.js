// ── State ─────────────────────────────────────────────────────────────────────
let currentMode = 'text-to-image';
let referenceImageBase64 = null;
let maskImageBase64 = null;      // auto-generated from canvas
let styleImageBase64 = null;
let generatedImageBase64 = null;
let progressInterval = null;
let progressStart = null;

// Inpaint canvas state
const inpaint = {
    canvas: null, overlay: null,
    ctx: null, ovCtx: null,
    painting: false,
    tool: 'brush',        // 'brush' | 'erase' | 'rect' | 'ellipse'
    size: 25,
    hardness: 80,         // 0=fully soft, 100=fully hard (Feature 1)
    lastPos: null,        // { x, y } for stroke interpolation (Feature 1)
    history: [],          // undo stack (array of ImageData)
    MAX_HISTORY: 20,
    sourceImg: null,      // original image element (for fullscreen at native res)
    previewCanvas: null,  // ephemeral canvas for shape preview (Feature 2)
    previewCtx: null,
    startPos: null,       // { x, y } drag start for shapes (Feature 2)
    shapeMode: false,     // currently drawing a shape (Feature 2)
    expanded: false,                              // (Feature 3)
    expansion: { top: 0, bottom: 0, left: 0, right: 0 },
    originalImg: null,    // image backup before first expansion (Feature 3)
};

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
            'A flat lay of a stylish summer outfit on white background, natural light',
            'Product photo of a luxury handbag on a clean marble surface',
            'A model wearing a tailored suit in a modern urban setting',
            'Close-up of fabric texture showing fine stitching and material detail',
            'A capsule wardrobe collection arranged neatly, editorial style'
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
            'Change the background to a clean white studio backdrop',
            'Replace the background with a luxury boutique interior',
            'Make the lighting look like a professional fashion shoot',
            'Convert to a high-contrast editorial black and white look',
            'Remove wrinkles and make the garment look freshly pressed'
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
            'Apply a high-fashion Vogue editorial aesthetic',
            'Transform into a vintage 90s fashion magazine style',
            'Apply a clean minimalist Scandinavian fashion look',
            'Make it look like a streetwear lookbook photo',
            'Apply a luxury brand campaign aesthetic, cinematic lighting'
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
            'Replace with a different color version of the same garment',
            'Swap the top with a fitted white shirt',
            'Change the shoes to white sneakers',
            'Replace the bag with a black leather tote',
            'Add a belt to define the waist of the outfit'
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
            'Extend to show the full outfit from head to toe',
            'Expand to reveal the full studio backdrop',
            'Show more of the runway or fashion show setting',
            'Extend to show the model\'s surroundings and environment',
            'Widen the shot to show a full lookbook spread'
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
const modelBtns            = document.querySelectorAll('.model-btn');
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
// Inpaint canvas elements (resolved after DOMContentLoaded)
let inpaintCanvasWrap, brushTool, eraseTool, brushSizeSlider, brushSizeVal, clearMaskBtn, undoMaskBtn;
const styleImageSection    = document.getElementById('styleImageSection');
const styleUploadArea      = document.getElementById('styleUploadArea');
const styleInput           = document.getElementById('styleInput');
const stylePlaceholder     = document.getElementById('stylePlaceholder');
const stylePreviewContainer= document.getElementById('stylePreviewContainer');
const stylePreview         = document.getElementById('stylePreview');
const removeStyleBtn       = document.getElementById('removeStyleBtn');
const galleryGrid          = document.getElementById('galleryGrid');
const clearHistoryBtn      = document.getElementById('clearHistoryBtn');
const downloadSelectedBtn  = document.getElementById('downloadSelectedBtn');
const selectedCountEl      = document.getElementById('selectedCount');
const progressFill         = document.getElementById('progressFill');
const progressTimer        = document.getElementById('progressTimer');
const progressStatus       = document.getElementById('progressStatus');
const presetBtn            = document.getElementById('presetBtn');
const presetLabel          = document.getElementById('presetLabel');
const presetDropdown       = document.getElementById('presetDropdown');

let activePreset = '';

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

    // Preset dropdown
    presetBtn.onclick = (e) => {
        e.stopPropagation();
        presetDropdown.classList.toggle('open');
    };
    document.addEventListener('click', () => presetDropdown.classList.remove('open'));
    presetDropdown.querySelectorAll('.preset-option').forEach(opt => {
        opt.onclick = (e) => {
            e.stopPropagation();
            activePreset = opt.dataset.preset;
            presetLabel.textContent = activePreset ? opt.textContent.trim().replace(/^.\s*/, '') : 'None';
            presetDropdown.querySelectorAll('.preset-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            presetDropdown.classList.remove('open');
            presetBtn.classList.toggle('preset-active', !!activePreset);
            saveSettingsToStorage();
            showToast(activePreset ? `Preset: ${opt.textContent.trim()}` : 'Preset cleared', 'info', 1500);
        };
    });

    // Model buttons
    modelBtns.forEach(btn => {
        btn.onclick = () => {
            modelBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            validateImageSize();
            saveSettingsToStorage();
        };
    });

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
        (b64) => {
            referenceImageBase64 = b64;
            if (currentMode === 'inpainting' || currentMode === 'outpainting') {
                loadImageIntoInpaintCanvas(b64);
            }
        },
        () => referenceImageBase64
    );
    removeImageBtn.onclick = (e) => { e.stopPropagation(); removeImage('source'); };

    // Inpaint canvas setup
    initInpaintCanvas();

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
    downloadSelectedBtn.onclick = downloadSelected;
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
            // Reset inpaint canvases fully
            if (inpaint.ctx)   { inpaint.ctx.clearRect(0, 0, inpaint.canvas.width, inpaint.canvas.height); inpaint.canvas.width = 0; }
            if (inpaint.ovCtx) { inpaint.ovCtx.clearRect(0, 0, inpaint.overlay.width, inpaint.overlay.height); inpaint.overlay.width = 0; }
            inpaint.history     = [];
            inpaint.expanded    = false;
            inpaint.expansion   = { top: 0, bottom: 0, left: 0, right: 0 };
            inpaint.originalImg = null;
            if (inpaint.canvas)  inpaint.canvas.style.display  = 'none';
            if (inpaint.overlay) inpaint.overlay.style.display = 'none';
            document.getElementById('inpaintPrompt').style.display = 'flex';
            toggleExpansionPanel(false);
            const applyBtn = document.getElementById('applyExpansionBtn');
            if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Apply'; }
            break;
        case 'mask':
            // Only clear the stroke layer, not the image
            maskImageBase64 = null;
            if (inpaint.ovCtx) inpaint.ovCtx.clearRect(0, 0, inpaint.overlay.width, inpaint.overlay.height);
            inpaint.history = [];
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

    // If switching to inpaint/outpaint with image already loaded, populate canvas
    if (config.showMask && referenceImageBase64 && inpaint.canvas && inpaint.canvas.width === 0) {
        loadImageIntoInpaintCanvas(referenceImageBase64);
    }

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
    if (imageSizeSelect.value === '4K' && !modelSelect.value.includes('pro')) {
        imageSizeSelect.value = '2K';
        showToast('4K is only available with NanoBanana Pro. Switched to 2K.', 'warning');
    }
}

function getSettings() {
    return {
        model:        document.querySelector('.model-btn.active')?.dataset.model ?? 'gemini-2.5-flash-image',
        aspect_ratio: aspectRatioSelect.value || null,
        image_size:   imageSizeSelect.value   || null,
        temperature:  parseFloat(temperatureSlider.value),
        seed:         seedInput.value ? parseInt(seedInput.value) : null,
        negative_prompt: negativePromptInput.value.trim() || null,
        preset: activePreset || null,
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
        if (s.model) {
            modelBtns.forEach(b => {
                b.classList.toggle('active', b.dataset.model === s.model);
            });
        }
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
        if (s.preset !== undefined) {
            activePreset = s.preset || '';
            const match = presetDropdown.querySelector(`[data-preset="${activePreset}"]`);
            if (match) {
                presetDropdown.querySelectorAll('.preset-option').forEach(o => o.classList.remove('active'));
                match.classList.add('active');
                presetLabel.textContent = activePreset ? match.textContent.trim().replace(/^.\s*/, '') : 'None';
                presetBtn.classList.toggle('preset-active', !!activePreset);
            }
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
    if (config.showMask) {
        maskImageBase64 = exportMaskAsBase64();
        if (!maskImageBase64) {
            showToast('Please paint the area you want to modify', 'warning');
            return;
        }
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
        updateSelectionUI();
        return;
    }

    galleryGrid.innerHTML = '';
    history.forEach((entry, i) => {
        const thumb = document.createElement('div');
        thumb.className = 'gallery-thumb';
        thumb.title = entry.prompt || entry.mode;
        thumb.dataset.image = entry.image;
        thumb.dataset.mode = entry.mode;
        thumb.dataset.index = i;
        thumb.innerHTML = `
            <img src="${entry.image}" alt="${entry.mode}" loading="lazy">
            <div class="thumb-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>`;
        thumb.onclick = (e) => {
            thumb.classList.toggle('selected');
            updateSelectionUI();
        };
        thumb.addEventListener('dblclick', () => openLightbox(entry.image, `nanobanana-${entry.mode}-${i}.png`));
        galleryGrid.appendChild(thumb);
    });
    updateSelectionUI();
}

function updateSelectionUI() {
    const selected = galleryGrid.querySelectorAll('.gallery-thumb.selected');
    const count = selected.length;
    selectedCountEl.textContent = count;
    downloadSelectedBtn.style.display = count > 0 ? '' : 'none';
}

function downloadSelected() {
    const selected = galleryGrid.querySelectorAll('.gallery-thumb.selected');
    if (selected.length === 0) return;
    selected.forEach((thumb, i) => {
        setTimeout(() => {
            const a = document.createElement('a');
            a.href = thumb.dataset.image;
            a.download = `nanobanana-${thumb.dataset.mode}-${thumb.dataset.index}.png`;
            a.click();
        }, i * 300); // stagger to avoid browser blocking
    });
    showToast(`Downloading ${selected.length} image${selected.length > 1 ? 's' : ''}...`, 'success');
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

// ── Inpaint Canvas ─────────────────────────────────────────────────────────────
// Architecture:
//   inpaintBg   = image drawn once, never touched (pointer-events: none)
//   inpaintMask = transparent canvas for black strokes only, sits on top
//   Erase/clear only affect inpaintMask — image is always preserved
//
// Fullscreen modal mirrors the same mask data via inpaintFsMask.

function initInpaintCanvas() {
    inpaintCanvasWrap = document.getElementById('inpaintCanvasWrap');
    brushTool        = document.getElementById('brushTool');
    eraseTool        = document.getElementById('eraseTool');
    brushSizeSlider  = document.getElementById('brushSize');
    brushSizeVal     = document.getElementById('brushSizeVal');
    clearMaskBtn     = document.getElementById('clearMaskBtn');
    undoMaskBtn      = document.getElementById('undoMaskBtn');

    inpaint.canvas  = document.getElementById('inpaintBg');
    inpaint.overlay = document.getElementById('inpaintMask');
    inpaint.ctx     = inpaint.canvas.getContext('2d');
    inpaint.ovCtx   = inpaint.overlay.getContext('2d');

    // Mini toolbar
    brushTool.onclick = () => setInpaintTool('brush');
    eraseTool.onclick = () => setInpaintTool('erase');
    document.getElementById('rectTool').onclick    = () => setInpaintTool('rect');
    document.getElementById('ellipseTool').onclick = () => setInpaintTool('ellipse');

    brushSizeSlider.oninput = () => {
        inpaint.size = parseInt(brushSizeSlider.value);
        brushSizeVal.textContent = inpaint.size;
        syncFsSize();
    };

    const brushHardnessSlider = document.getElementById('brushHardness');
    const brushHardnessVal    = document.getElementById('brushHardnessVal');
    brushHardnessSlider.oninput = () => {
        inpaint.hardness = parseInt(brushHardnessSlider.value);
        brushHardnessVal.textContent = inpaint.hardness;
        syncFsHardness();
    };

    clearMaskBtn.onclick = () => {
        saveInpaintHistory();
        inpaint.ovCtx.clearRect(0, 0, inpaint.overlay.width, inpaint.overlay.height);
        syncFsMask();
        showToast('Mask cleared', 'info', 1500);
    };
    undoMaskBtn.onclick = undoInpaint;

    // Expand canvas button + panel
    document.getElementById('expandCanvasBtn').onclick = () => toggleExpansionPanel();
    document.getElementById('applyExpansionBtn').onclick = applyExpansion;
    document.getElementById('resetExpansionBtn').onclick = resetExpansion;
    ['expTop','expBottom','expLeft','expRight'].forEach(id => {
        document.getElementById(id).oninput = (e) => {
            const key = id.replace('exp', '').toLowerCase();
            inpaint.expansion[key] = Math.max(0, Math.min(512, parseInt(e.target.value) || 0));
        };
    });

    // Fullscreen button
    document.getElementById('fullscreenMaskBtn').onclick = openInpaintModal;

    // Create the mini preview canvas for shape preview (above mask layer)
    inpaint.previewCanvas = createPreviewCanvas(inpaint.overlay);
    inpaint.previewCtx    = inpaint.previewCanvas.getContext('2d');

    // Attach drawing to mask canvas
    attachDrawEvents(inpaint.overlay, getCanvasPos);

    // ── Fullscreen modal ──
    const modal       = document.getElementById('inpaintModal');
    const fsBg        = document.getElementById('inpaintFsBg');
    const fsMask      = document.getElementById('inpaintFsMask');
    const fsBrushBtn  = document.getElementById('fsBrushTool');
    const fsEraseBtn  = document.getElementById('fsEraseTool');
    const fsSizeSlide = document.getElementById('fsBrushSize');
    const fsSizeVal   = document.getElementById('fsBrushSizeVal');
    const fsUndoBtn   = document.getElementById('fsUndoBtn');
    const fsClearBtn  = document.getElementById('fsClearBtn');
    const fsCloseBtn  = document.getElementById('closeInpaintModal');

    fsBrushBtn.onclick = () => setInpaintTool('brush');
    fsEraseBtn.onclick = () => setInpaintTool('erase');
    document.getElementById('fsRectTool').onclick    = () => setInpaintTool('rect');
    document.getElementById('fsEllipseTool').onclick = () => setInpaintTool('ellipse');

    fsSizeSlide.oninput = () => {
        inpaint.size = parseInt(fsSizeSlide.value);
        brushSizeSlider.value = inpaint.size;
        brushSizeVal.textContent = inpaint.size;
        fsSizeVal.textContent = inpaint.size;
    };

    const fsHardnessSlide = document.getElementById('fsBrushHardness');
    const fsHardnessVal   = document.getElementById('fsBrushHardnessVal');
    fsHardnessSlide.oninput = () => {
        inpaint.hardness = parseInt(fsHardnessSlide.value);
        brushHardnessSlider.value = inpaint.hardness;
        brushHardnessVal.textContent = inpaint.hardness;
        fsHardnessVal.textContent = inpaint.hardness;
    };
    fsClearBtn.onclick = () => {
        saveInpaintHistory();
        inpaint.ovCtx.clearRect(0, 0, inpaint.overlay.width, inpaint.overlay.height);
        fsMask.getContext('2d').clearRect(0, 0, fsMask.width, fsMask.height);
        showToast('Mask cleared', 'info', 1500);
    };
    fsUndoBtn.onclick = () => {
        undoInpaint();
        syncFsMask();
    };
    fsCloseBtn.onclick = () => {
        // Copy fs mask back to mini mask
        inpaint.ovCtx.clearRect(0, 0, inpaint.overlay.width, inpaint.overlay.height);
        inpaint.ovCtx.drawImage(fsMask, 0, 0, inpaint.overlay.width, inpaint.overlay.height);
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };

    // Draw events on fullscreen mask
    attachDrawEvents(fsMask, getFsCanvasPos);
}

function attachDrawEvents(canvas, getPosFunc) {
    // Global mouseup to cancel shape if released outside canvas
    if (!attachDrawEvents._windowBound) {
        attachDrawEvents._windowBound = true;
        window.addEventListener('mouseup', () => {
            if (inpaint.shapeMode) {
                clearShapePreview(inpaint.overlay);
                clearShapePreview(document.getElementById('inpaintFsMask'));
                inpaint.shapeMode = false;
                inpaint.startPos  = null;
            }
            inpaint.painting = false;
            inpaint.lastPos  = null;
        });
    }

    canvas.addEventListener('mousedown', (e) => {
        const pos = getPosFunc(e, canvas);
        if (inpaint.tool === 'rect' || inpaint.tool === 'ellipse') {
            saveInpaintHistory();
            inpaint.startPos  = pos;
            inpaint.shapeMode = true;
        } else {
            saveInpaintHistory();
            inpaint.painting = true;
            inpaint.lastPos  = null;
            paintDot(canvas, pos);
            inpaint.lastPos  = pos;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const pos = getPosFunc(e, canvas);
        if (inpaint.shapeMode && inpaint.startPos) {
            drawShapePreview(canvas, inpaint.startPos, pos);
        } else if (inpaint.painting) {
            if (inpaint.lastPos) {
                interpolateAndPaint(canvas, inpaint.lastPos, pos);
            } else {
                paintDot(canvas, pos);
            }
            inpaint.lastPos = pos;
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (inpaint.shapeMode && inpaint.startPos) {
            const pos = getPosFunc(e, canvas);
            clearShapePreview(canvas);
            commitShape(canvas, inpaint.startPos, pos);
            inpaint.startPos  = null;
            inpaint.shapeMode = false;
            if (canvas === inpaint.overlay) syncFsMask();
        } else {
            inpaint.painting = false;
            inpaint.lastPos  = null;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        clearShapePreview(canvas);
        inpaint.painting = false;
        inpaint.lastPos  = null;
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const pos = getPosFunc(e.touches[0], canvas);
        if (inpaint.tool === 'rect' || inpaint.tool === 'ellipse') {
            saveInpaintHistory();
            inpaint.startPos  = pos;
            inpaint.shapeMode = true;
        } else {
            saveInpaintHistory();
            inpaint.painting = true;
            inpaint.lastPos  = null;
            paintDot(canvas, pos);
            inpaint.lastPos  = pos;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const pos = getPosFunc(e.touches[0], canvas);
        if (inpaint.shapeMode && inpaint.startPos) {
            drawShapePreview(canvas, inpaint.startPos, pos);
        } else if (inpaint.painting) {
            if (inpaint.lastPos) interpolateAndPaint(canvas, inpaint.lastPos, pos);
            else paintDot(canvas, pos);
            inpaint.lastPos = pos;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (inpaint.shapeMode && inpaint.startPos) {
            const pos = getPosFunc(e.changedTouches[0], canvas);
            clearShapePreview(canvas);
            commitShape(canvas, inpaint.startPos, pos);
            inpaint.startPos  = null;
            inpaint.shapeMode = false;
            if (canvas === inpaint.overlay) syncFsMask();
        } else {
            inpaint.painting = false;
            inpaint.lastPos  = null;
        }
    });
}

function paintDot(canvas, pos) {
    const ctx = canvas.getContext('2d');
    const radius = inpaint.size / 2;
    if (radius < 1) return;
    const hardness = inpaint.hardness / 100;
    const isErase  = inpaint.tool === 'erase';

    ctx.save();
    ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';

    if (hardness >= 0.99) {
        // Hard brush
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Soft brush: radial gradient falloff
        const innerR = radius * hardness;
        const grad = ctx.createRadialGradient(pos.x, pos.y, innerR, pos.x, pos.y, radius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
    if (canvas === inpaint.overlay) syncFsMask();
}

function interpolateAndPaint(canvas, from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step  = Math.max(1, inpaint.size / 4);
    const steps = Math.ceil(dist / step);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        paintDot(canvas, { x: from.x + dx * t, y: from.y + dy * t });
    }
}

function getCanvasPos(e, canvas) {
    canvas = canvas || inpaint.overlay;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function getFsCanvasPos(e, canvas) {
    return getCanvasPos(e, canvas);
}

// Sync mini mask → fullscreen mask
function syncFsMask() {
    const fsMask = document.getElementById('inpaintFsMask');
    if (!fsMask || fsMask.width === 0) return;
    const ctx = fsMask.getContext('2d');
    ctx.clearRect(0, 0, fsMask.width, fsMask.height);
    ctx.drawImage(inpaint.overlay, 0, 0, fsMask.width, fsMask.height);
}

// Sync fullscreen mask → mini mask
function syncMiniMask(fsMask) {
    if (!inpaint.overlay || inpaint.overlay.width === 0) return;
    inpaint.ovCtx.clearRect(0, 0, inpaint.overlay.width, inpaint.overlay.height);
    inpaint.ovCtx.drawImage(fsMask, 0, 0, inpaint.overlay.width, inpaint.overlay.height);
}

function syncFsTool() {
    const fsMask = document.getElementById('inpaintFsMask');
    ['fsBrushTool','fsEraseTool','fsRectTool','fsEllipseTool'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', el.id === `fs${inpaint.tool.charAt(0).toUpperCase() + inpaint.tool.slice(1)}Tool`);
    });
    if (fsMask) fsMask.style.cursor = inpaint.tool === 'erase' ? 'cell' : 'crosshair';
}

function syncFsSize() {
    const s = document.getElementById('fsBrushSize');
    const v = document.getElementById('fsBrushSizeVal');
    if (s) s.value = inpaint.size;
    if (v) v.textContent = inpaint.size;
}

function syncFsHardness() {
    const s = document.getElementById('fsBrushHardness');
    const v = document.getElementById('fsBrushHardnessVal');
    if (s) s.value = inpaint.hardness;
    if (v) v.textContent = inpaint.hardness;
}

function setInpaintTool(tool) {
    inpaint.tool = tool;
    // Reset shape state on tool switch
    inpaint.shapeMode = false;
    inpaint.startPos  = null;
    clearShapePreview(inpaint.overlay);

    const toolMap = { brush: brushTool, erase: eraseTool,
                      rect:  document.getElementById('rectTool'),
                      ellipse: document.getElementById('ellipseTool') };
    Object.entries(toolMap).forEach(([t, el]) => el && el.classList.toggle('active', t === tool));
    inpaint.overlay.style.cursor = tool === 'erase' ? 'cell' : 'crosshair';
    syncFsTool();
}

// ── Shape fill helpers (Feature 2) ────────────────────────────────────────

function createPreviewCanvas(referenceCanvas) {
    const pv = document.createElement('canvas');
    pv.style.position      = 'absolute';
    pv.style.top           = '0';
    pv.style.left          = '0';
    pv.style.pointerEvents = 'none';
    pv.style.zIndex        = '10';
    pv.width  = referenceCanvas.width;
    pv.height = referenceCanvas.height;
    pv.style.width  = referenceCanvas.style.width  || referenceCanvas.width  + 'px';
    pv.style.height = referenceCanvas.style.height || referenceCanvas.height + 'px';
    referenceCanvas.parentElement.appendChild(pv);
    return pv;
}

function getPreviewCtx(maskCanvas) {
    const fsMask = document.getElementById('inpaintFsMask');
    if (maskCanvas === fsMask) {
        const fsPv = document.getElementById('inpaintFsPreview');
        return fsPv ? fsPv.getContext('2d') : null;
    }
    return inpaint.previewCtx;
}

function drawShapePreview(maskCanvas, start, end) {
    const pvCtx = getPreviewCtx(maskCanvas);
    if (!pvCtx) return;
    const pv = pvCtx.canvas;
    pvCtx.clearRect(0, 0, pv.width, pv.height);

    // Scale start/end from CSS display coords → canvas pixel coords
    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;

    // start and end are already in canvas pixel space (from getCanvasPos)
    const x  = Math.min(start.x, end.x);
    const y  = Math.min(start.y, end.y);
    const w  = Math.abs(end.x - start.x);
    const h  = Math.abs(end.y - start.y);
    const cx = x + w / 2, cy = y + h / 2;

    // Sync preview canvas CSS size to mask canvas CSS size (for fullscreen)
    pv.style.width  = maskCanvas.style.width  || maskCanvas.width  + 'px';
    pv.style.height = maskCanvas.style.height || maskCanvas.height + 'px';
    pv.style.left   = maskCanvas.style.left   || '0px';
    pv.style.top    = maskCanvas.style.top    || '0px';

    pvCtx.save();
    pvCtx.globalAlpha = 0.5;
    pvCtx.fillStyle   = 'rgba(0,0,0,0.6)';
    if (inpaint.tool === 'rect') {
        pvCtx.fillRect(x, y, w, h);
    } else {
        pvCtx.beginPath();
        pvCtx.ellipse(cx, cy, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
        pvCtx.fill();
    }
    pvCtx.globalAlpha = 1.0;
    pvCtx.strokeStyle = 'rgba(255,255,255,0.9)';
    pvCtx.lineWidth   = Math.max(1, 1 / scaleX);
    pvCtx.setLineDash([4 / scaleX, 4 / scaleX]);
    pvCtx.strokeRect(x, y, w, h);
    pvCtx.restore();
}

function clearShapePreview(maskCanvas) {
    if (!maskCanvas) return;
    const pvCtx = getPreviewCtx(maskCanvas);
    if (!pvCtx) return;
    const pv = pvCtx.canvas;
    pvCtx.clearRect(0, 0, pv.width, pv.height);
}

function commitShape(maskCanvas, start, end) {
    const ctx = maskCanvas.getContext('2d');
    const x   = Math.min(start.x, end.x);
    const y   = Math.min(start.y, end.y);
    const w   = Math.abs(end.x - start.x);
    const h   = Math.abs(end.y - start.y);
    const cx  = x + w / 2, cy = y + h / 2;
    if (w < 2 || h < 2) return;

    const hardness = inpaint.hardness / 100;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    if (hardness >= 0.99) {
        ctx.fillStyle = 'rgba(0,0,0,1)';
        if (inpaint.tool === 'rect') {
            ctx.fillRect(x, y, w, h);
        } else {
            ctx.beginPath();
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Clip to shape, fill with radial gradient
        ctx.beginPath();
        if (inpaint.tool === 'rect') {
            ctx.rect(x, y, w, h);
        } else {
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
        }
        ctx.clip();
        const outerR  = Math.max(w, h) / 2;
        const innerR  = outerR * hardness;
        const grad    = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
}

// ── Canvas Expansion (Feature 3) ──────────────────────────────────────────

function toggleExpansionPanel(forceState) {
    const panel = document.getElementById('expansionPanel');
    if (!panel) return;
    const show = forceState !== undefined ? forceState : panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
}

function applyExpansion() {
    const exp  = inpaint.expansion;
    const addW = exp.left + exp.right;
    const addH = exp.top  + exp.bottom;
    if (addW === 0 && addH === 0) {
        showToast('Set at least one expansion value', 'warning');
        return;
    }
    if (!inpaint.canvas.width) {
        showToast('Upload a source image first', 'warning');
        return;
    }

    // Backup original before first expansion
    if (!inpaint.originalImg) inpaint.originalImg = inpaint.sourceImg;

    const origW = inpaint.canvas.width;
    const origH = inpaint.canvas.height;
    const newW  = origW + addW;
    const newH  = origH + addH;

    // Snapshot both canvases
    const bgSnap   = document.createElement('canvas');
    bgSnap.width   = origW; bgSnap.height = origH;
    bgSnap.getContext('2d').drawImage(inpaint.canvas, 0, 0);

    const maskSnap  = document.createElement('canvas');
    maskSnap.width  = origW; maskSnap.height = origH;
    maskSnap.getContext('2d').drawImage(inpaint.overlay, 0, 0);

    // Resize BG canvas
    inpaint.canvas.width  = newW;
    inpaint.canvas.height = newH;
    inpaint.ctx.fillStyle = '#000';
    inpaint.ctx.fillRect(0, 0, newW, newH);
    inpaint.ctx.drawImage(bgSnap, exp.left, exp.top);

    // Resize mask canvas
    inpaint.overlay.width  = newW;
    inpaint.overlay.height = newH;
    inpaint.ovCtx.clearRect(0, 0, newW, newH);
    // Expansion zones = opaque black on mask → white in export → AI fills them
    inpaint.ovCtx.fillStyle = 'rgba(0,0,0,1)';
    if (exp.top    > 0) inpaint.ovCtx.fillRect(0,               0,               newW,      exp.top);
    if (exp.bottom > 0) inpaint.ovCtx.fillRect(0,               exp.top + origH, newW,      exp.bottom);
    if (exp.left   > 0) inpaint.ovCtx.fillRect(0,               exp.top,         exp.left,  origH);
    if (exp.right  > 0) inpaint.ovCtx.fillRect(exp.left + origW, exp.top,        exp.right, origH);
    // Restore existing user strokes at offset position
    inpaint.ovCtx.drawImage(maskSnap, exp.left, exp.top);

    // Update the image sent to the API to the expanded canvas
    referenceImageBase64 = inpaint.canvas.toDataURL('image/png');

    inpaint.expanded = true;
    inpaint.history  = [];

    // Resize preview canvas if it exists
    if (inpaint.previewCanvas) {
        inpaint.previewCanvas.width  = newW;
        inpaint.previewCanvas.height = newH;
    }

    // Update CSS display sizes after layout
    requestAnimationFrame(() => {
        const maxW  = inpaintCanvasWrap.clientWidth || 600;
        const scale = Math.min(1, maxW / newW);
        const dispW = Math.round(newW * scale);
        const dispH = Math.round(newH * scale);

        inpaint.canvas.style.width   = dispW + 'px';
        inpaint.canvas.style.height  = dispH + 'px';
        inpaint.overlay.style.width  = dispW + 'px';
        inpaint.overlay.style.height = dispH + 'px';
        inpaint.overlay.style.left   = '0px';
        inpaint.overlay.style.top    = '0px';
        if (inpaint.previewCanvas) {
            inpaint.previewCanvas.style.width  = dispW + 'px';
            inpaint.previewCanvas.style.height = dispH + 'px';
        }
    });

    // Disable Apply to prevent double-expansion
    const applyBtn = document.getElementById('applyExpansionBtn');
    if (applyBtn) { applyBtn.disabled = true; applyBtn.textContent = 'Applied'; }

    showToast(`Canvas expanded by ${addW > 0 ? addW + 'px wide' : ''}${addW > 0 && addH > 0 ? ' + ' : ''}${addH > 0 ? addH + 'px tall' : ''}`, 'success');
    toggleExpansionPanel(false);
}

function resetExpansion() {
    if (!inpaint.originalImg) {
        showToast('No expansion to reset', 'info', 1500);
        return;
    }
    inpaint.expansion   = { top: 0, bottom: 0, left: 0, right: 0 };
    inpaint.expanded    = false;
    const origSrc       = inpaint.originalImg.src;
    inpaint.originalImg = null;

    ['expTop','expBottom','expLeft','expRight'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = 0;
    });

    const applyBtn = document.getElementById('applyExpansionBtn');
    if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Apply'; }

    loadImageIntoInpaintCanvas(origSrc);
    showToast('Canvas reset to original', 'info');
}

function openInpaintModal() {
    if (!inpaint.canvas.width || !inpaint.sourceImg) {
        showToast('Upload a source image first', 'warning');
        return;
    }
    const modal  = document.getElementById('inpaintModal');
    const fsBg   = document.getElementById('inpaintFsBg');
    const fsMask = document.getElementById('inpaintFsMask');

    // Use native image resolution so CSS max-width/max-height can scale it up
    const nW = inpaint.sourceImg.naturalWidth;
    const nH = inpaint.sourceImg.naturalHeight;

    fsBg.width   = nW;
    fsBg.height  = nH;
    fsMask.width  = nW;
    fsMask.height = nH;

    // Draw image at native res; scale up existing mini mask strokes
    fsBg.getContext('2d').drawImage(inpaint.sourceImg, 0, 0);
    fsMask.getContext('2d').drawImage(inpaint.overlay, 0, 0, nW, nH);

    syncFsTool();
    syncFsSize();
    syncFsHardness();

    // Resize fullscreen preview canvas to native res
    const fsPv = document.getElementById('inpaintFsPreview');
    if (fsPv) { fsPv.width = nW; fsPv.height = nH; }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // After modal is visible, position fsMask (and fsPreview) to exactly cover fsBg
    requestAnimationFrame(() => {
        const wrap   = fsBg.parentElement.getBoundingClientRect();
        const bgRect = fsBg.getBoundingClientRect();
        const w = bgRect.width + 'px', h = bgRect.height + 'px';
        const l = (bgRect.left - wrap.left) + 'px', t = (bgRect.top - wrap.top) + 'px';
        fsMask.style.width  = w; fsMask.style.height = h;
        fsMask.style.left   = l; fsMask.style.top    = t;
        if (fsPv) {
            fsPv.style.width  = w; fsPv.style.height = h;
            fsPv.style.left   = l; fsPv.style.top    = t;
        }
    });
}

function loadImageIntoInpaintCanvas(base64) {
    const img = new Image();
    img.onload = () => {
        inpaint.sourceImg = img;  // store for fullscreen native-res drawing

        const maxW = inpaintCanvasWrap.clientWidth || 600;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        // BG canvas = image (pixel buffer matches scaled display size)
        inpaint.canvas.width  = w;
        inpaint.canvas.height = h;
        inpaint.ctx.drawImage(img, 0, 0, w, h);

        // Mask canvas = same pixel buffer, transparent (strokes only)
        inpaint.overlay.width  = w;
        inpaint.overlay.height = h;
        inpaint.ovCtx.clearRect(0, 0, w, h);

        inpaint.history  = [];
        inpaint.expanded = false;
        inpaint.expansion = { top: 0, bottom: 0, left: 0, right: 0 };

        document.getElementById('inpaintPrompt').style.display = 'none';
        inpaint.canvas.style.display  = 'block';
        inpaint.overlay.style.display = 'block';

        // Wait for layout to settle so getBoundingClientRect is accurate
        requestAnimationFrame(() => {
            const bgRect = inpaint.canvas.getBoundingClientRect();
            inpaint.overlay.style.width  = bgRect.width  + 'px';
            inpaint.overlay.style.height = bgRect.height + 'px';
            inpaint.overlay.style.left   = '0px';
            inpaint.overlay.style.top    = '0px';

            // Resize and reposition the preview canvas to match
            if (inpaint.previewCanvas) {
                inpaint.previewCanvas.width  = w;
                inpaint.previewCanvas.height = h;
                inpaint.previewCanvas.style.width  = bgRect.width  + 'px';
                inpaint.previewCanvas.style.height = bgRect.height + 'px';
                inpaint.previewCanvas.style.left   = '0px';
                inpaint.previewCanvas.style.top    = '0px';
            }
        });
    };
    img.src = base64;
}

function saveInpaintHistory() {
    if (!inpaint.overlay.width) return;
    const snap = inpaint.ovCtx.getImageData(0, 0, inpaint.overlay.width, inpaint.overlay.height);
    inpaint.history.push(snap);
    if (inpaint.history.length > inpaint.MAX_HISTORY) inpaint.history.shift();
}

function undoInpaint() {
    if (inpaint.history.length === 0) { showToast('Nothing to undo', 'info', 1500); return; }
    const prev = inpaint.history.pop();
    inpaint.ovCtx.putImageData(prev, 0, 0);
}

// Export: white image with black where user painted
function exportMaskAsBase64() {
    if (!inpaint.overlay.width) return null;

    // Check something was painted
    const data = inpaint.ovCtx.getImageData(0, 0, inpaint.overlay.width, inpaint.overlay.height);
    const hasPaint = data.data.some((v, i) => i % 4 === 3 && v > 10);
    if (!hasPaint) return null;

    const out = document.createElement('canvas');
    out.width  = inpaint.overlay.width;
    out.height = inpaint.overlay.height;
    const ctx = out.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, out.width, out.height);
    // Paint black strokes on top
    ctx.drawImage(inpaint.overlay, 0, 0);

    return out.toDataURL('image/png');
}
