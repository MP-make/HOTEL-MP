document.addEventListener('DOMContentLoaded', () => {

    const sidebarItems = document.querySelectorAll(".sidebar-item");
    const mainSections = document.querySelectorAll("main section");
    const logoutLink = document.getElementById('logout-link');
    const deleteAccountLink = document.getElementById('delete-account-link'); // ejemplo extra

    // --- Funciones para manejar los modales de confirmación ---
    const showConfirmModal = (message, onConfirm) => {
        const modalOverlay = document.getElementById('confirm-modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        modalTitle.textContent = "Confirmación";
        modalMessage.textContent = message;
        modalOverlay.style.display = 'flex';

        const handleConfirm = () => {
            onConfirm();
            hideConfirmModal();
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        const handleCancel = () => {
            hideConfirmModal();
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    };

    const hideConfirmModal = () => {
        const modalOverlay = document.getElementById('confirm-modal-overlay');
        modalOverlay.style.display = 'none';
    };

    // --- Lógica para el cierre de sesión ---
        
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();

            showConfirmModal('¿Estás seguro de que quieres cerrar la sesión?', () => {
                // Borrar las mismas claves que usa index.js
                localStorage.removeItem('user'); 
                localStorage.removeItem('userSession'); 
                localStorage.removeItem('user_id');

                console.log('Sesión cerrada. Redirigiendo...');
                // Redirección segura
                window.location.replace('index.html'); 
            });
        });
    }


    // --- Ejemplo: lógica para eliminar cuenta (usa la misma confirmación) ---
    if (deleteAccountLink) {
        deleteAccountLink.addEventListener('click', (e) => {
            e.preventDefault();

            showConfirmModal('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.', () => {
                // Aquí pondrías la lógica de eliminación (API, base de datos, etc.)
                console.log('Cuenta eliminada.');
                localStorage.clear();
                window.location.href = 'index.html';
            });
        });
    }

    // --- Lógica de navegación del sidebar ---
    sidebarItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            const targetSectionId = item.getAttribute("href").substring(1);

            // Remueve la clase 'active' de todos los elementos
            sidebarItems.forEach(i => i.classList.remove("active"));
            
            // Añade la clase 'active' al elemento clickeado
            item.classList.add("active");

            // Oculta todas las secciones principales
            mainSections.forEach(section => {
                section.style.display = 'none';
            });

            // Muestra la sección correspondiente
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
        });
    });

});
