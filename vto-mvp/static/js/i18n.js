/**
 * i18n — French / English UI translations
 * Usage: applyLang('fr') or applyLang('en')
 * Elements with data-i18n="key" get their textContent replaced.
 * Elements with data-i18n-placeholder="key" get their placeholder replaced.
 * Elements with data-i18n-title="key" get their title replaced.
 */

const TRANSLATIONS = {
    en: {
        // Nav
        'nav.tryon':      'Virtual Try-On',
        'nav.playground': 'Playground',
        'nav.logout':     'Logout',
        'nav.theme':      'Toggle dark mode',
        // Login
        'login.title':    'Virtual Try-On',
        'login.subtitle': 'Sign in to continue',
        'login.username': 'Username',
        'login.password': 'Password',
        'login.submit':   'Sign in',
        // Index
        'index.tagline':  'See yourself in our collection',
        'modal.upload.title':   'Upload Your Photo',
        'modal.upload.btn':     'Generate Try-On',
        'modal.upload.drop':    'Click to upload or drag and drop',
        'modal.upload.hint':    'JPG, PNG up to 10MB',
        'modal.loading.text':   'Generating your try-on image...',
        'modal.loading.status': 'NanoBanana is working...',
        'modal.loading.hint':   'This may take 10-20 seconds',
        'modal.result.title':   'Your Virtual Try-On',
        'modal.result.hint':    'Drag the handle to compare before / after',
        'modal.result.before':  'Before',
        'modal.result.after':   'After',
        'modal.result.download':'Download Result',
        'modal.result.retry':   'Try Another',
        'modal.result.close':   'Close',
        'modal.error.title':    'Oops!',
        'modal.error.retry':    'Try Again',
        // Playground — modes
        'mode.text-to-image':   'Text to Image',
        'mode.image-editing':   'Edit Image',
        'mode.style-transfer':  'Style Transfer',
        'mode.inpainting':      'Inpainting',
        'mode.outpainting':     'Outpainting',
        // Playground — prompt area
        'prompt.heading':       'Prompt',
        'prompt.placeholder':   'Describe what you want to generate...\nExample: A serene mountain landscape at sunset with vibrant orange clouds',
        'prompt.optimize':      'Optimize',
        'prompt.optimize.title':'Enhance your prompt with AI',
        'preset.label':         'Preset',
        'preset.none':          'None',
        // Playground — model
        'model.fast':           'Fast',
        'model.balanced':       'Balanced',
        'model.best':           'Best quality',
        // Playground — negative prompt
        'neg.toggle':           'Negative Prompt',
        'neg.placeholder':      'What to avoid in the image... (e.g. blurry, watermark, bad anatomy)',
        // Playground — settings
        'settings.title':       '⚙ Settings',
        'settings.aspect':      'Aspect Ratio',
        'settings.aspect.auto': 'Auto (Default)',
        'settings.aspect.sq':   '1:1 — Square',
        'settings.aspect.ls':   '4:3 — Landscape',
        'settings.aspect.pt':   '3:4 — Portrait',
        'settings.aspect.ws':   '16:9 — Widescreen',
        'settings.aspect.vt':   '9:16 — Vertical',
        'settings.aspect.ph':   '3:2 — Photo',
        'settings.aspect.php':  '2:3 — Photo Portrait',
        'settings.aspect.uw':   '21:9 — Ultrawide',
        'settings.res':         'Resolution',
        'settings.res.auto':    'Auto (Default)',
        'settings.res.1k':      '1K — 1024px',
        'settings.res.2k':      '2K — 2048px',
        'settings.res.4k':      '4K — 4096px (Pro only)',
        'settings.temp':        'Creativity (Temperature)',
        'settings.temp.hint':   'Lower = precise | Higher = creative',
        'settings.seed':        'Seed (reproducibility)',
        'settings.seed.ph':     'Random',
        'settings.seed.title':  'Random seed',
        'settings.seed.hint':   'Same seed + same prompt = same result',
        'settings.search':      'Enable Google Search grounding',
        'settings.search.hint': 'Ground generation with real-time web information',
        // Playground — source image
        'src.title.optional':   'Reference Image (Optional)',
        'src.click':            'Click to add an image',
        'src.hint':             'This image will be sent along with your prompt',
        // Inpaint
        'mask.title':           'Paint Mask',
        'mask.hint':            'Paint black over the area you want the AI to modify',
        'mask.brush':           'Brush',
        'mask.erase':           'Erase',
        'mask.rect':            'Rect',
        'mask.ellipse':         'Ellipse',
        'mask.size':            'Size',
        'mask.hardness':        'Hardness',
        'mask.undo':            'Undo',
        'mask.clear':           'Clear',
        'mask.expand':          'Expand',
        'mask.fullscreen':      'Fullscreen',
        'mask.top':             'Top (px)',
        'mask.bottom':          'Bottom (px)',
        'mask.left':            'Left (px)',
        'mask.right':           'Right (px)',
        'mask.apply':           'Apply',
        'mask.reset':           'Reset',
        'mask.upload.prompt':   'Upload a source image above to start painting',
        'mask.black.hint':      'Black areas = region the AI will modify',
        'mask.done':            'Done',
        // Style image
        'style.title':          'Style Reference',
        'style.click':          'Click to add style reference',
        'style.hint':           'Style from this image will be applied',
        // Generate
        'generate.btn':         'Generate',
        'generate.loading':     'Generating...',
        // Output
        'output.title':         'Result',
        'output.fullscreen':    'Fullscreen',
        'output.download':      'Download',
        'output.placeholder':   'Your generated image will appear here',
        'output.shortcut':      'Press Ctrl+Enter to generate',
        'output.generating':    'Generating your image...',
        'output.status':        'NanoBanana is working...',
        // History
        'history.title':        'History',
        'history.clear':        'Clear',
        'history.empty':        'No generations yet',
        'history.download':     'Download',
    },
    fr: {
        // Nav
        'nav.tryon':      'Essayage Virtuel',
        'nav.playground': 'Playground',
        'nav.logout':     'Déconnexion',
        'nav.theme':      'Basculer le mode sombre',
        // Login
        'login.title':    'Essayage Virtuel',
        'login.subtitle': 'Connectez-vous pour continuer',
        'login.username': 'Nom d\'utilisateur',
        'login.password': 'Mot de passe',
        'login.submit':   'Se connecter',
        // Index
        'index.tagline':  'Essayez notre collection virtuellement',
        'modal.upload.title':   'Téléchargez votre photo',
        'modal.upload.btn':     'Générer l\'essayage',
        'modal.upload.drop':    'Cliquez pour télécharger ou glissez-déposez',
        'modal.upload.hint':    'JPG, PNG jusqu\'à 10 Mo',
        'modal.loading.text':   'Génération de votre essayage en cours...',
        'modal.loading.status': 'NanoBanana travaille...',
        'modal.loading.hint':   'Cela peut prendre 10 à 20 secondes',
        'modal.result.title':   'Votre Essayage Virtuel',
        'modal.result.hint':    'Faites glisser le curseur pour comparer avant / après',
        'modal.result.before':  'Avant',
        'modal.result.after':   'Après',
        'modal.result.download':'Télécharger le résultat',
        'modal.result.retry':   'Réessayer',
        'modal.result.close':   'Fermer',
        'modal.error.title':    'Oups !',
        'modal.error.retry':    'Réessayer',
        // Playground — modes
        'mode.text-to-image':   'Texte en Image',
        'mode.image-editing':   'Modifier l\'Image',
        'mode.style-transfer':  'Transfert de Style',
        'mode.inpainting':      'Retouche',
        'mode.outpainting':     'Extension',
        // Playground — prompt area
        'prompt.heading':       'Prompt',
        'prompt.placeholder':   'Décrivez ce que vous voulez générer...\nExemple : Un paysage de montagne au coucher du soleil',
        'prompt.optimize':      'Optimiser',
        'prompt.optimize.title':'Améliorer votre prompt avec l\'IA',
        'preset.label':         'Préréglage',
        'preset.none':          'Aucun',
        // Playground — model
        'model.fast':           'Rapide',
        'model.balanced':       'Équilibré',
        'model.best':           'Meilleure qualité',
        // Playground — negative prompt
        'neg.toggle':           'Prompt Négatif',
        'neg.placeholder':      'Ce qu\'il faut éviter... (ex : flou, filigrane, mauvaise anatomie)',
        // Playground — settings
        'settings.title':       '⚙ Paramètres',
        'settings.aspect':      'Format d\'image',
        'settings.aspect.auto': 'Auto (Défaut)',
        'settings.aspect.sq':   '1:1 — Carré',
        'settings.aspect.ls':   '4:3 — Paysage',
        'settings.aspect.pt':   '3:4 — Portrait',
        'settings.aspect.ws':   '16:9 — Écran large',
        'settings.aspect.vt':   '9:16 — Vertical',
        'settings.aspect.ph':   '3:2 — Photo',
        'settings.aspect.php':  '2:3 — Photo Portrait',
        'settings.aspect.uw':   '21:9 — Ultra-large',
        'settings.res':         'Résolution',
        'settings.res.auto':    'Auto (Défaut)',
        'settings.res.1k':      '1K — 1024px',
        'settings.res.2k':      '2K — 2048px',
        'settings.res.4k':      '4K — 4096px (Pro uniquement)',
        'settings.temp':        'Créativité (Température)',
        'settings.temp.hint':   'Bas = précis | Haut = créatif',
        'settings.seed':        'Graine (reproductibilité)',
        'settings.seed.ph':     'Aléatoire',
        'settings.seed.title':  'Graine aléatoire',
        'settings.seed.hint':   'Même graine + même prompt = même résultat',
        'settings.search':      'Activer la recherche Google',
        'settings.search.hint': 'Ancrer la génération avec des informations web en temps réel',
        // Playground — source image
        'src.title.optional':   'Image de référence (Optionnelle)',
        'src.click':            'Cliquez pour ajouter une image',
        'src.hint':             'Cette image sera envoyée avec votre prompt',
        // Inpaint
        'mask.title':           'Masque de peinture',
        'mask.hint':            'Peignez en noir la zone que l\'IA doit modifier',
        'mask.brush':           'Pinceau',
        'mask.erase':           'Effacer',
        'mask.rect':            'Rectangle',
        'mask.ellipse':         'Ellipse',
        'mask.size':            'Taille',
        'mask.hardness':        'Dureté',
        'mask.undo':            'Annuler',
        'mask.clear':           'Effacer',
        'mask.expand':          'Agrandir',
        'mask.fullscreen':      'Plein écran',
        'mask.top':             'Haut (px)',
        'mask.bottom':          'Bas (px)',
        'mask.left':            'Gauche (px)',
        'mask.right':           'Droite (px)',
        'mask.apply':           'Appliquer',
        'mask.reset':           'Réinitialiser',
        'mask.upload.prompt':   'Téléchargez une image pour commencer à peindre',
        'mask.black.hint':      'Zones noires = région que l\'IA va modifier',
        'mask.done':            'Terminé',
        // Style image
        'style.title':          'Référence de style',
        'style.click':          'Cliquez pour ajouter une référence de style',
        'style.hint':           'Le style de cette image sera appliqué',
        // Generate
        'generate.btn':         'Générer',
        'generate.loading':     'Génération...',
        // Output
        'output.title':         'Résultat',
        'output.fullscreen':    'Plein écran',
        'output.download':      'Télécharger',
        'output.placeholder':   'Votre image générée apparaîtra ici',
        'output.shortcut':      'Appuyez sur Ctrl+Entrée pour générer',
        'output.generating':    'Génération de votre image...',
        'output.status':        'NanoBanana travaille...',
        // History
        'history.title':        'Historique',
        'history.clear':        'Effacer',
        'history.empty':        'Aucune génération pour l\'instant',
        'history.download':     'Télécharger',
    }
};

function t(key) {
    const lang = localStorage.getItem('lang') || 'en';
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS['en'][key] || key;
}

function applyLang(lang) {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val) el.textContent = val;
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = t(key);
        if (val) el.placeholder = val;
    });

    // Titles / tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = t(key);
        if (val) el.title = val;
    });

    // Update lang toggle buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

function initLang() {
    const lang = localStorage.getItem('lang') || 'en';
    applyLang(lang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.onclick = () => applyLang(btn.dataset.lang);
    });
}

document.addEventListener('DOMContentLoaded', initLang);
