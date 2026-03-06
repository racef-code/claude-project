// ── State ─────────────────────────────────────────────────────────────────────
let selectedItemId = null;
let userImagesBase64 = []; // Array of base64 images (1-5)
const MAX_IMAGES = 5;
let generatedTryOnBase64 = null;
let tryOnTimerInterval = null;
let tryOnProgressStart = null;
let sliderDragging = false;

// ── DOM ───────────────────────────────────────────────────────────────────────
const modal      = document.getElementById('tryOnModal');
const closeBtn   = document.querySelector('.close');
const fileInput  = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const generateBtn = document.getElementById('generateBtn');

const modalStep1   = document.getElementById('modalStep1');
const modalLoading = document.getElementById('modalLoading');
const modalResults = document.getElementById('modalResults');
const modalError   = document.getElementById('modalError');

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadCatalog();
    setupEventListeners();
});

// ── Catalog ───────────────────────────────────────────────────────────────────
async function loadCatalog() {
    try {
        const response = await fetch('/catalog');
        const data = await response.json();
        const catalogGrid = document.getElementById('catalog');
        catalogGrid.innerHTML = '';
        data.items.forEach(item => catalogGrid.appendChild(createCatalogItem(item)));
    } catch (error) {
        console.error('Error loading catalog:', error);
        showToast('Failed to load catalog. Please refresh the page.', 'error');
    }
}

function createCatalogItem(item) {
    const div = document.createElement('div');
    div.className = 'catalog-item';
    div.innerHTML = `
        <div class="catalog-item-image">
            <img src="/static/${item.image}" alt="${item.name}"
                 onerror="this.parentElement.innerHTML='<div style=\\"display:flex;align-items:center;justify-content:center;height:100%;background:var(--bg-tertiary);color:var(--text-muted);font-size:1rem;\\">Image Coming Soon</div>'">
        </div>
        <div class="catalog-item-info">
            <div class="catalog-item-name">${item.name}</div>
            <div class="catalog-item-price">${item.price}</div>
            <button class="btn btn-primary btn-try-on" onclick="openTryOnModal('${item.id}', '${item.name}')">
                Try It On
            </button>
        </div>
    `;
    return div;
}

// ── Event Listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
    closeBtn.onclick = closeModal;
    window.onclick = (e) => { if (e.target === modal) closeModal(); };

    uploadArea.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) handleFileUploads(files);
    };

    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('drag-over');
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) handleFileUploads(files);
    };

    generateBtn.onclick = generateTryOn;

    document.getElementById('tryAnotherBtn').onclick = () => {
        resetModal();
        closeModal();
    };
    document.getElementById('closeResultsBtn').onclick = closeModal;
    document.getElementById('retryBtn').onclick = () => showModalStep('step1');

    document.getElementById('downloadResultBtn').onclick = () => {
        if (!generatedTryOnBase64) return;
        const a = document.createElement('a');
        a.href = generatedTryOnBase64;
        a.download = `nanobanana-tryon-${Date.now()}.png`;
        a.click();
        showToast('Image downloaded!', 'success');
    };
}

// ── File Upload ───────────────────────────────────────────────────────────────
function handleFileUploads(files) {
    // Check if adding these files would exceed the limit
    if (userImagesBase64.length + files.length > MAX_IMAGES) {
        showToast(`Maximum ${MAX_IMAGES} images allowed. You have ${userImagesBase64.length} image(s).`, 'warning');
        return;
    }

    // Validate and process each file
    let validFiles = [];
    for (let file of files) {
        if (file.size > 10 * 1024 * 1024) {
            showToast(`"${file.name}" is too large. Max 10MB per file.`, 'error');
            continue;
        }
        if (!file.type.startsWith('image/')) {
            showToast(`"${file.name}" is not an image.`, 'error');
            continue;
        }
        validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Process valid files
    let processed = 0;
    validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            userImagesBase64.push(e.target.result);
            processed++;

            // When all files are processed, update the UI
            if (processed === validFiles.length) {
                showImagePreviews();
                generateBtn.style.display = 'block';
                showToast(`${validFiles.length} image(s) uploaded successfully`, 'success');
            }
        };
        reader.readAsDataURL(file);
    });
}

// Show image previews in a grid
function showImagePreviews() {
    const uploadPreviews = document.getElementById('uploadPreviews');
    uploadPreviews.innerHTML = '';
    uploadPreviews.style.display = 'grid';
    document.querySelector('.upload-placeholder').style.display = 'none';

    userImagesBase64.forEach((imageData, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${imageData}" alt="Preview ${index + 1}">
            <button class="remove-btn" onclick="removeImage(${index})" title="Remove image">&times;</button>
            <span class="image-number">${index + 1}</span>
        `;
        uploadPreviews.appendChild(previewItem);
    });
}

// Remove an image from the array
window.removeImage = function(index) {
    userImagesBase64.splice(index, 1);

    if (userImagesBase64.length === 0) {
        // No more images, show upload placeholder
        const uploadPreviews = document.getElementById('uploadPreviews');
        uploadPreviews.style.display = 'none';
        uploadPreviews.innerHTML = '';
        document.querySelector('.upload-placeholder').style.display = 'block';
        generateBtn.style.display = 'none';
        showToast('All images removed', 'info');
    } else {
        // Update previews with new numbering
        showImagePreviews();
        showToast('Image removed', 'info');
    }
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function openTryOnModal(itemId, itemName) {
    selectedItemId = itemId;
    document.getElementById('selectedItemName').textContent = itemName;
    modal.classList.add('active');
    showModalStep('step1');

    if (userImagesBase64.length > 0) {
        showImagePreviews();
        generateBtn.style.display = 'block';
    }
}

function closeModal() {
    modal.classList.remove('active');
    stopTryOnProgress();
}

function showModalStep(step) {
    modalStep1.classList.remove('active');
    modalLoading.classList.remove('active');
    modalResults.classList.remove('active');
    modalError.classList.remove('active');

    switch (step) {
        case 'step1':   modalStep1.classList.add('active');   break;
        case 'loading': modalLoading.classList.add('active'); break;
        case 'results': modalResults.classList.add('active'); break;
        case 'error':   modalError.classList.add('active');   break;
    }
}

function resetModal() {
    selectedItemId = null;
    // Don't reset userImagesBase64 - keep cached for trying multiple items
    generatedTryOnBase64 = null;
    showModalStep('step1');
}

// ── Progress ──────────────────────────────────────────────────────────────────
function startTryOnProgress() {
    tryOnProgressStart = Date.now();
    const fill  = document.getElementById('tryOnProgressFill');
    const timer = document.getElementById('tryOnTimer');

    if (fill) fill.style.width = '0%';
    if (timer) timer.textContent = '0s';

    tryOnTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - tryOnProgressStart) / 1000);
        if (timer) timer.textContent = elapsed + 's';
        if (fill) {
            const pct = 90 * (1 - Math.exp(-elapsed / 20));
            fill.style.width = pct.toFixed(1) + '%';
        }
    }, 500);
}

function stopTryOnProgress() {
    if (tryOnTimerInterval) {
        clearInterval(tryOnTimerInterval);
        tryOnTimerInterval = null;
    }
    const fill = document.getElementById('tryOnProgressFill');
    if (fill) fill.style.width = '100%';
}

// ── Generate Try-On ───────────────────────────────────────────────────────────
async function generateTryOn() {
    if (userImagesBase64.length === 0 || !selectedItemId) {
        showToast('Please upload at least one photo first', 'warning');
        return;
    }

    console.log(`Starting try-on with ${userImagesBase64.length} reference image(s)...`);
    showModalStep('loading');
    startTryOnProgress();

    try {
        const response = await fetch('/try-on', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_images: userImagesBase64, item_id: selectedItemId })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to generate try-on');

        if (data.success) {
            generatedTryOnBase64 = data.generated_image;
            displayResults(data.generated_image);
            showToast('Try-on complete!', 'success');
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Try-on error:', error);
        document.getElementById('errorText').textContent = error.message;
        showModalStep('error');
        showToast('Try-on failed: ' + error.message, 'error');
    } finally {
        stopTryOnProgress();
    }
}

// ── Results + Comparison Slider ───────────────────────────────────────────────
function displayResults(generatedBase64) {
    const originalImg  = document.getElementById('originalImage');
    const generatedImg = document.getElementById('generatedImage');

    // Show first uploaded image as the original
    originalImg.src  = userImagesBase64[0];
    generatedImg.src = generatedBase64;

    showModalStep('results');

    // Init slider after images load
    Promise.all([
        new Promise(r => { if (originalImg.complete)  r(); else originalImg.onload  = r; }),
        new Promise(r => { if (generatedImg.complete) r(); else generatedImg.onload = r; })
    ]).then(() => initComparisonSlider());
}

function initComparisonSlider() {
    const slider = document.getElementById('comparisonSlider');
    const after  = slider.querySelector('.comparison-after');
    const handle = slider.querySelector('.comparison-handle');

    if (!slider || !after || !handle) return;

    let position = 50; // percent

    function setPosition(pct) {
        position = Math.max(0, Math.min(100, pct));
        after.style.clipPath  = `inset(0 ${100 - position}% 0 0)`;
        handle.style.left     = position + '%';
    }

    setPosition(50);

    function getX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function onMove(e) {
        if (!sliderDragging) return;
        e.preventDefault();
        const rect = slider.getBoundingClientRect();
        const pct  = ((getX(e) - rect.left) / rect.width) * 100;
        setPosition(pct);
    }

    handle.addEventListener('mousedown',  (e) => { sliderDragging = true; e.preventDefault(); });
    handle.addEventListener('touchstart', (e) => { sliderDragging = true; }, { passive: true });
    slider.addEventListener('mousedown',  (e) => { sliderDragging = true; onMove(e); });
    slider.addEventListener('touchstart', (e) => { sliderDragging = true; onMove(e); }, { passive: true });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });

    document.addEventListener('mouseup',   () => { sliderDragging = false; });
    document.addEventListener('touchend',  () => { sliderDragging = false; });
}
