# VTO-MVP Major Improvements Plan

## Context
The app works but uses a **deprecated SDK** (`google-generativeai`), which means settings like aspect_ratio, image_size, temperature don't actually work. The UI collects them but the backend ignores them. The app also lacks modern UX patterns (dark mode, toast notifications, generation history, prompt templates). This plan migrates to the correct SDK and adds high-impact features.

---

## Phase 1: SDK Migration + NanoBanana 2 (Foundation - Must Do First)

**Files:** `requirements.txt`, `app.py`, `playground.html`, `playground.js`

### Backend Migration
- Change `google-generativeai>=0.8.0` to `google-genai>=1.0.0`
- Rewrite imports: `from google import genai` + `from google.genai import types`
- Replace `genai.configure()` + `genai.GenerativeModel()` with `genai.Client()` + `client.models.generate_content()`
- Use `types.GenerateContentConfig(response_modalities=["IMAGE"], image_config=types.ImageConfig(...))` to properly pass aspect_ratio, image_size
- Use `part.as_image()` for clean image extraction
- Wire temperature, seed, negative_prompt from frontend to backend

### Add NanoBanana 2 Models
Add support for the new NanoBanana 2 models in model selection:
- **gemini-2.5-flash-image** (NanoBanana 1 - Current, Fast)
- **gemini-2.5-flash-image-v2** (NanoBanana 2 - New, Better quality)
- **gemini-3-pro-image-preview** (NanoBanana Pro - Highest quality, supports 4K)

Frontend `playground.html` model dropdown:
```html
<select id="modelSelect">
    <option value="gemini-2.5-flash-image">NanoBanana 1 (Fast)</option>
    <option value="gemini-2.5-flash-image-v2" selected>NanoBanana 2 (Recommended)</option>
    <option value="gemini-3-pro-image-preview">NanoBanana Pro (Highest Quality)</option>
</select>
```

- **Result:** All settings work + access to latest models

---

## Phase 2: Toast Notifications

**Files:** new `static/js/toast.js`, `style.css`, `main.js`, `playground.js`, `index.html`, `playground.html`

- Create reusable `showToast(message, type)` function
- Replace all 9 `alert()` calls with styled toast notifications (success/error/warning/info)
- Fixed position, auto-dismiss after 4s, slide-in animation

---

## Phase 3: CSS Variables + Dark Mode + Color Refresh

**Files:** `style.css`, `playground.css`, `index.html`, `playground.html`, new `static/js/utils.js`

- Define CSS variables for all colors (`:root` and `[data-theme="dark"]`)
- Replace all hardcoded colors with `var(--...)` across both CSS files
- Shift accent color from pure black `#000` to indigo `#6366f1` for modern look
- Add theme toggle button in nav bar
- Persist theme choice in localStorage

---

## Phase 4: Prompt Templates

**Files:** `playground.js`, `playground.html`, `playground.css`

- Add template arrays to each mode config (5 templates per mode)
- Render clickable template chips below mode description
- Clicking a chip fills the prompt textarea
- Templates update when switching modes

---

## Phase 5: Advanced Generation Controls + Prompt Optimization

**Files:** `playground.html`, `playground.js`, `playground.css`, `app.py`

### Generation Controls
- **Temperature slider** (0-2, step 0.1) with live value display
- **Seed input** with random dice button for reproducibility
- **Negative prompt** collapsible textarea ("What to avoid...")
- All wired to backend via the `/generate` request

### AI Prompt Optimizer
Add a "✨ Optimize Prompt" button that uses Gemini to enhance the user's prompt for better image generation results.

**UI (`playground.html`):**
```html
<div class="prompt-actions">
    <button id="optimizePromptBtn" class="btn btn-secondary btn-small">
        ✨ Optimize Prompt
    </button>
    <span id="optimizeStatus" class="optimize-status"></span>
</div>
```

**Backend (`app.py`) - New Endpoint:**
```python
@app.route('/optimize-prompt', methods=['POST'])
def optimize_prompt():
    """Use Gemini to enhance the user's prompt for better image generation"""
    data = request.get_json()
    user_prompt = data.get('prompt')
    mode = data.get('mode', 'text-to-image')

    # Use Gemini text model to optimize the prompt
    client = genai.Client(api_key=GOOGLE_API_KEY)

    system_prompt = f"""You are an expert at writing prompts for AI image generation (NanoBanana/Gemini).

Mode: {mode}

Your task: Transform the user's prompt into a detailed, effective prompt that will generate high-quality images.

Guidelines:
- Add specific visual details (lighting, composition, style, mood)
- Include artistic references when relevant (e.g., "in the style of...")
- Specify camera angles, perspective, depth of field
- Mention quality indicators (4K, highly detailed, professional)
- Keep the core intent of the original prompt
- Make it concise but descriptive (max 200 words)
- For product/portrait: specify lighting setup
- For landscape: describe atmosphere, time of day
- For editing modes: be precise about the changes

Return ONLY the optimized prompt, nothing else."""

    response = client.models.generate_content(
        model='gemini-2.0-flash-exp',
        contents=[system_prompt, f"User's prompt: {user_prompt}"],
    )

    optimized = response.text.strip()
    return jsonify({'success': True, 'optimized_prompt': optimized})
```

**Frontend Logic (`playground.js`):**
- Click "✨ Optimize Prompt" button
- Show loading state ("Optimizing...")
- Call `/optimize-prompt` endpoint
- Replace textarea content with optimized version
- Show toast: "Prompt optimized! ✨"
- User can still edit the optimized prompt

**Example Flow:**
- User enters: "a cat"
- Optimized: "A majestic cat with emerald green eyes, sitting regally on a velvet cushion, soft studio lighting from the left creating gentle shadows, shallow depth of field with bokeh background, professional pet photography, 4K quality, highly detailed fur texture"

**Benefits:**
- Helps beginners get better results
- Teaches users what makes a good prompt
- Saves time for experienced users
- Works across all 5 generation modes

---

## Phase 6: Better Loading Experience

**Files:** `playground.html`, `playground.js`, `playground.css`

- Replace simple spinner with progress bar + elapsed timer
- Animated progress bar that asymptotically approaches 90% over ~30s
- Shows "12s elapsed" counter
- Jumps to 100% on completion
- Shimmer/skeleton effect on output area

---

## Phase 7: Generation History Gallery

**Files:** `app.py`, `playground.html`, `playground.js`, `playground.css`

- Backend: Store last 20 generations in-memory per session (with Flask `session`)
- Add `/history` GET and DELETE endpoints
- Frontend: Thumbnail gallery strip below the output area
- Click thumbnail to view full image
- Clear history button
- Also save prompt history in localStorage (last 50 prompts)

---

## Phase 8: Fullscreen Image Viewer (Lightbox)

**Files:** `utils.js`, `style.css`, `index.html`, `playground.html`

- Click any generated image to open fullscreen overlay
- Download button, close button
- Scroll-to-zoom on desktop, pinch-to-zoom on mobile

---

## Phase 9: Image Comparison Slider

**Files:** `index.html`, `main.js`, `style.css`

- Replace side-by-side results in try-on modal with a draggable before/after slider
- Mouse/touch drag to reveal original vs generated
- "Before" / "After" labels

---

## Phase 10: UI Polish

**Files:** `style.css`, `playground.css`

- Glass morphism effect on cards (`backdrop-filter: blur`)
- Smooth image reveal animation on generation complete
- Better mobile: horizontal scrollable mode tabs, larger touch targets
- Consistent border-radius and shadow system

---

## Implementation Order (by impact/effort)

| Step | Phase | Effort | Impact | Notes |
|------|-------|--------|--------|-------|
| 1 | Phase 1 - SDK Migration + NanoBanana 2 | Medium | Critical | Unlocks all other features |
| 2 | Phase 3 - CSS Vars + Dark Mode | Medium | High | Foundation for visual improvements |
| 3 | Phase 2 - Toast Notifications | Low | High | Better UX immediately |
| 4 | Phase 4 - Prompt Templates | Low | High | Helps users get started |
| 5 | Phase 5 - Advanced Controls + Prompt Optimizer | Medium | High | AI-powered prompt enhancement |
| 6 | Phase 6 - Loading Experience | Low | Medium | Professional feel |
| 7 | Phase 7 - History Gallery | Medium | High | Keep track of work |
| 8 | Phase 8 - Lightbox | Low | Medium | Better image viewing |
| 9 | Phase 9 - Comparison Slider | Medium | Medium | Try-on page enhancement |
| 10 | Phase 10 - UI Polish | Low | Medium | Final touches |

---

## New Files Created
- `static/js/toast.js` - Toast notification system
- `static/js/utils.js` - Theme toggle, lightbox, shared utilities

## New Features Summary

### 🚀 NanoBanana 2 Support
- Access to latest `gemini-2.5-flash-image-v2` model
- Better quality image generation
- Dropdown to choose between NanoBanana 1, 2, or Pro

### ✨ AI Prompt Optimizer
- One-click prompt enhancement using Gemini
- Transforms simple prompts into detailed, effective descriptions
- Mode-aware optimization (different strategies for different modes)
- Helps beginners, saves time for experts
- Example: "a cat" → "A majestic cat with emerald eyes, soft studio lighting, 4K, highly detailed..."

### 🎨 Dark Mode
- Toggle between light and dark themes
- Smooth transitions
- Persisted preference
- Modern indigo accent color instead of pure black

### 📜 Generation History
- Last 20 generations saved per session
- Thumbnail gallery
- Click to view/download previous results
- Prompt history (last 50 prompts)

### 🎯 Advanced Controls
- Temperature slider for creativity control
- Seed input for reproducible results
- Negative prompt support
- All settings actually work (not just UI decoration)

### 🎭 Better UX
- Toast notifications instead of alerts
- Progress bar with timer
- Fullscreen image viewer
- Before/after comparison slider for try-on
- Prompt templates for quick start
- Glass morphism UI effects

## Verification
After each phase:
1. Run `pip install -r requirements.txt` (Phase 1 only)
2. Start server with `python app.py`
3. Test text-to-image generation on playground
4. Test virtual try-on on main page
5. Verify settings are applied (check server console logs)
6. Test on mobile viewport (browser dev tools)
