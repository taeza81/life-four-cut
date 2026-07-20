document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Header Date ---
    const dateEl = document.getElementById('current-date');
    const today = new Date();
    dateEl.textContent = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    // --- 2. Theme Switching ---
    const themeButtons = document.querySelectorAll('.theme-btn');
    const frame = document.getElementById('frame');
    const frameTitle = document.querySelector('.frame-title');
    const frameFooter = document.querySelector('.frame-footer-text');

    const themeContent = {
        classic: { title: 'CLASSIC LIFE 4-CUT', footer: 'MEMORIES' },
        pastel: { title: 'PASTEL DREAM 4-CUT', footer: 'LOVELY DAY' },
        neon: { title: 'NEON VIBE 4-CUT', footer: 'CRAZY NIGHT' },
        nature: { title: 'NATURE LOVERS 4-CUT', footer: 'WARM DAYS' }
    };

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const selectedTheme = btn.getAttribute('data-theme');
            
            frame.classList.remove('theme-classic', 'theme-pastel', 'theme-neon', 'theme-nature');
            frame.classList.add(`theme-${selectedTheme}`);

            frameTitle.textContent = themeContent[selectedTheme].title;
            frameFooter.textContent = themeContent[selectedTheme].footer;
        });
    });

    // --- 3. Workspace Zoom & Pan ---
    const workspace = document.getElementById('workspace');
    const previewPanel = document.getElementById('preview-panel');
    let currentZoom = 1;
    let isPanningWorkspace = false;
    let startX = 0, startY = 0;
    let currentPanX = 0, currentPanY = 0;

    const updateWorkspaceTransform = () => {
        workspace.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoom})`;
        document.getElementById('zoom-level').textContent = `${Math.round(currentZoom * 100)}%`;
    };

    document.getElementById('zoom-in-btn').addEventListener('click', () => {
        currentZoom = Math.min(currentZoom + 0.1, 3);
        updateWorkspaceTransform();
    });
    
    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        currentZoom = Math.max(currentZoom - 0.1, 0.3);
        updateWorkspaceTransform();
    });

    document.getElementById('zoom-fit-btn').addEventListener('click', () => {
        // Calculate fit scale based on panel size and frame size (approx 400x1200)
        const panelHeight = previewPanel.clientHeight;
        const frameHeight = frame.clientHeight + 100; // adding some margin
        currentZoom = Math.min(1, panelHeight / frameHeight);
        currentPanX = 0; currentPanY = 0;
        updateWorkspaceTransform();
    });

    // Initial fit
    setTimeout(() => document.getElementById('zoom-fit-btn').click(), 100);

    previewPanel.addEventListener('mousedown', (e) => {
        if(e.target === previewPanel || e.target.id === 'workspace' || e.target.id === 'print-area') {
            isPanningWorkspace = true;
            startX = e.clientX - currentPanX;
            startY = e.clientY - currentPanY;
            previewPanel.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanningWorkspace) return;
        currentPanX = e.clientX - startX;
        currentPanY = e.clientY - startY;
        updateWorkspaceTransform();
    });

    window.addEventListener('mouseup', () => {
        isPanningWorkspace = false;
        previewPanel.style.cursor = 'grab';
    });


    // --- 4. Image Upload & Editing (Pan/Zoom inside slot) ---
    const fileInputs = document.querySelectorAll('.file-input');
    
    // Store image state
    const imgStates = {};

    const updateImageTransform = (id) => {
        const state = imgStates[id];
        const el = document.getElementById(id);
        if(el) {
            el.style.transform = `scale(${state.scale}) translate(${state.panX}px, ${state.panY}px)`;
        }
    };

    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const imageUrl = URL.createObjectURL(file);
                const idNum = this.id.split('-')[1];
                const imgElId = `img-${idNum}`;
                const label = document.getElementById(`label-${idNum}`);
                const imgEl = document.getElementById(imgElId);
                
                imgEl.style.backgroundImage = `url(${imageUrl})`;
                label.classList.add('has-image');

                // Initialize state
                imgStates[imgElId] = { scale: 1, panX: 0, panY: 0, isDragging: false, startX: 0, startY: 0 };
                updateImageTransform(imgElId);

                // Add mouse events to imgEl for pan/zoom
                imgEl.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // prevent default drag behavior
                    const state = imgStates[imgElId];
                    state.isDragging = true;
                    // Note: need to account for current scale when panning
                    state.startX = e.clientX - (state.panX * state.scale);
                    state.startY = e.clientY - (state.panY * state.scale);
                    imgEl.style.cursor = 'grabbing';
                });

                imgEl.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    const state = imgStates[imgElId];
                    // zoom in/out
                    const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
                    state.scale = Math.max(0.1, state.scale + zoomDelta);
                    updateImageTransform(imgElId);
                }, { passive: false });
            }
        });
    });

    // Global mouse move/up for image dragging
    window.addEventListener('mousemove', (e) => {
        Object.keys(imgStates).forEach(id => {
            const state = imgStates[id];
            if (state && state.isDragging) {
                // Calculate new pan, factoring in the current scale
                state.panX = (e.clientX - state.startX) / state.scale;
                state.panY = (e.clientY - state.startY) / state.scale;
                updateImageTransform(id);
            }
        });
    });

    window.addEventListener('mouseup', () => {
        Object.keys(imgStates).forEach(id => {
            if (imgStates[id]) {
                imgStates[id].isDragging = false;
                const el = document.getElementById(id);
                if(el) el.style.cursor = 'move';
            }
        });
    });


    // --- 5. Print Logic ---
    document.getElementById('print-btn').addEventListener('click', () => {
        window.print();
    });

    // --- 6. Reset Logic ---
    document.getElementById('reset-btn').addEventListener('click', () => {
        if(confirm('모든 사진을 초기화하시겠습니까?')) {
            document.querySelectorAll('.upload-label').forEach(label => {
                label.classList.remove('has-image');
            });
            document.querySelectorAll('.photo-image').forEach(img => {
                img.style.backgroundImage = 'none';
                img.style.transform = 'none';
            });
            fileInputs.forEach(input => input.value = '');
            // clear states
            Object.keys(imgStates).forEach(k => delete imgStates[k]);
        }
    });

    // --- 7. Download Image (html2canvas) ---
    document.getElementById('download-btn').addEventListener('click', async () => {
        const frameElement = document.getElementById('frame');
        
        // temporarily remove box-shadow for clean export
        const originalShadow = frameElement.style.boxShadow;
        frameElement.style.boxShadow = 'none';

        try {
            const canvas = await html2canvas(frameElement, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: null // transparent
            });
            
            const link = document.createElement('a');
            link.download = `life4cut_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error generating image:', error);
            alert('이미지 저장 중 오류가 발생했습니다.');
        } finally {
            frameElement.style.boxShadow = originalShadow;
        }
    });
});
