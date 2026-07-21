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
    let baseZoom = 1; // Used to represent 100% in UI
    let isPanningWorkspace = false;
    let startX = 0, startY = 0;
    let currentPanX = 0, currentPanY = 0;

    const updateWorkspaceTransform = () => {
        workspace.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoom})`;
        const displayPercent = Math.round((currentZoom / baseZoom) * 100);
        document.getElementById('zoom-level').textContent = `${displayPercent}%`;
    };

    document.getElementById('zoom-in-btn').addEventListener('click', () => {
        // Step by 10% of baseZoom
        currentZoom = Math.min(currentZoom + (0.1 * baseZoom), 3 * baseZoom);
        updateWorkspaceTransform();
    });
    
    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        // Step by 10% of baseZoom
        currentZoom = Math.max(currentZoom - (0.1 * baseZoom), 0.3 * baseZoom);
        updateWorkspaceTransform();
    });

    document.getElementById('zoom-fit-btn').addEventListener('click', () => {
        const panelHeight = previewPanel.clientHeight;
        const panelWidth = previewPanel.clientWidth;
        const frameHeight = frame.clientHeight + 100; // adding some vertical margin
        const frameWidth = frame.clientWidth + 40;  // adding some horizontal margin
        
        // Fit based on the most constrained dimension
        const fitScale = Math.min(1, panelHeight / frameHeight, panelWidth / frameWidth);
        
        currentZoom = fitScale;
        // Also update baseZoom so 'Fit' is always 100%
        baseZoom = fitScale;
        
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
    const photoSlots = document.querySelectorAll('.photo-slot');
    
    // Store image state
    const imgStates = {};

    const updateImageTransform = (id) => {
        const state = imgStates[id];
        const el = document.getElementById(id);
        if(el) {
            el.style.transform = `scale(${state.scale}) translate(${state.panX}px, ${state.panY}px)`;
        }
    };

    const processFile = (file, idNum) => {
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            const imgElId = `img-${idNum}`;
            const label = document.getElementById(`label-${idNum}`);
            const imgEl = document.getElementById(imgElId);
            
            imgEl.style.backgroundImage = `url(${imageUrl})`;
            label.classList.add('has-image');

            // Initialize state or reset it
            const isNew = !imgStates[imgElId];
            imgStates[imgElId] = { scale: 1, panX: 0, panY: 0, isDragging: false, startX: 0, startY: 0 };
            updateImageTransform(imgElId);

            // Add mouse events only once
            if (isNew) {
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

                // Double click to replace image
                imgEl.addEventListener('dblclick', () => {
                    document.getElementById(`file-${idNum}`).click();
                });
            }
        }
    };

    // File input change
    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const idNum = this.id.split('-')[1];
                processFile(file, idNum);
                // Reset input value to allow selecting the same file again if needed
                this.value = '';
            }
        });
    });

    // Prevent default drag behaviors for the whole window
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, e => e.preventDefault());
    });

    // Drag and drop support
    photoSlots.forEach((slot, index) => {
        const idNum = index + 1;
        
        slot.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            slot.classList.add('drag-over');
        });

        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            slot.classList.add('drag-over');
        });

        slot.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Check if leaving the actual slot, not a child element
            if (!slot.contains(e.relatedTarget)) {
                slot.classList.remove('drag-over');
            }
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            slot.classList.remove('drag-over');
            
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                processFile(file, idNum);
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
        const workspaceElement = document.getElementById('workspace');
        
        // temporarily remove box-shadow for clean export
        const originalShadow = frameElement.style.boxShadow;
        frameElement.style.boxShadow = 'none';

        // temporarily remove workspace transform to fix text spacing issues on zoom out
        const originalTransform = workspaceElement.style.transform;
        workspaceElement.style.transform = 'none';

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
            workspaceElement.style.transform = originalTransform;
        }
    });
});
