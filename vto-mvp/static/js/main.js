// Global state
let selectedItemId = null;
let userImageBase64 = null;

// DOM elements
const modal = document.getElementById('tryOnModal');
const closeBtn = document.querySelector('.close');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadPreview = document.getElementById('uploadPreview');
const generateBtn = document.getElementById('generateBtn');

// Modal steps
const modalStep1 = document.getElementById('modalStep1');
const modalLoading = document.getElementById('modalLoading');
const modalResults = document.getElementById('modalResults');
const modalError = document.getElementById('modalError');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadCatalog();
    setupEventListeners();
});

// Load catalog from backend
async function loadCatalog() {
    try {
        const response = await fetch('/catalog');
        const data = await response.json();

        const catalogGrid = document.getElementById('catalog');
        catalogGrid.innerHTML = '';

        data.items.forEach(item => {
            const itemElement = createCatalogItem(item);
            catalogGrid.appendChild(itemElement);
        });
    } catch (error) {
        console.error('Error loading catalog:', error);
        alert('Failed to load catalog. Please refresh the page.');
    }
}

// Create catalog item HTML
function createCatalogItem(item) {
    const div = document.createElement('div');
    div.className = 'catalog-item';
    div.innerHTML = `
        <div class="catalog-item-image">
            <img src="/static/${item.image}" alt="${item.name}" onerror="this.parentElement.innerHTML='<div style=\\"display:flex;align-items:center;justify-content:center;height:100%;background:#f0f0f0;color:#999;font-size:1rem;\\">Image Coming Soon</div>'">
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

// Setup event listeners
function setupEventListeners() {
    // Close modal
    closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };

    // Upload area click
    uploadArea.onclick = () => fileInput.click();

    // File input change
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    // Drag and drop
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
            handleFileUpload(file);
        }
    };

    // Generate button
    generateBtn.onclick = generateTryOn;

    // Try another button
    document.getElementById('tryAnotherBtn').onclick = () => {
        resetModal();
        closeModal();
    };

    // Close results button
    document.getElementById('closeResultsBtn').onclick = closeModal;

    // Retry button
    document.getElementById('retryBtn').onclick = () => {
        showModalStep('step1');
    };
}

// Open try-on modal
function openTryOnModal(itemId, itemName) {
    selectedItemId = itemId;
    document.getElementById('selectedItemName').textContent = itemName;
    modal.classList.add('active');
    showModalStep('step1');

    // If user already uploaded image, show it
    if (userImageBase64) {
        uploadPreview.src = userImageBase64;
        uploadPreview.style.display = 'block';
        document.querySelector('.upload-placeholder').style.display = 'none';
        generateBtn.style.display = 'block';
    }
}

// Close modal
function closeModal() {
    modal.classList.remove('active');
}

// Handle file upload
function handleFileUpload(file) {
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        userImageBase64 = e.target.result;
        uploadPreview.src = userImageBase64;
        uploadPreview.style.display = 'block';
        document.querySelector('.upload-placeholder').style.display = 'none';
        generateBtn.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// Generate try-on
async function generateTryOn() {
    if (!userImageBase64 || !selectedItemId) {
        alert('Please upload a photo first');
        return;
    }

    console.log('Starting try-on generation...');
    showModalStep('loading');

    try {
        const response = await fetch('/try-on', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_image: userImageBase64,
                item_id: selectedItemId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate try-on');
        }

        if (data.success) {
            console.log('Try-on generated successfully');
            displayResults(data.generated_image);
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error generating try-on:', error);
        showError(error.message);
    }
}

// Display results
function displayResults(generatedImageBase64) {
    document.getElementById('originalImage').src = userImageBase64;
    document.getElementById('generatedImage').src = generatedImageBase64;
    showModalStep('results');
}

// Show error
function showError(message) {
    document.getElementById('errorText').textContent = message;
    showModalStep('error');
}

// Show modal step
function showModalStep(step) {
    // Hide all steps
    modalStep1.classList.remove('active');
    modalLoading.classList.remove('active');
    modalResults.classList.remove('active');
    modalError.classList.remove('active');

    // Show selected step
    switch (step) {
        case 'step1':
            modalStep1.classList.add('active');
            break;
        case 'loading':
            modalLoading.classList.add('active');
            break;
        case 'results':
            modalResults.classList.add('active');
            break;
        case 'error':
            modalError.classList.add('active');
            break;
    }
}

// Reset modal
function resetModal() {
    // Don't reset userImageBase64 - keep it cached
    selectedItemId = null;
    showModalStep('step1');
}
