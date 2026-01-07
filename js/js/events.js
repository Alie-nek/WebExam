/* global searchCourses, searchResources, calculateOrderPrice, submitOrder */
/* global filterResources, searchTutors, saveOrderChanges, confirmDeleteOrder */

function resetCourseSearch() {
    const courseNameInput = document.getElementById('courseName');
    const courseLevelSelect = document.getElementById('courseLevel');
    
    if (courseNameInput) courseNameInput.value = '';
    if (courseLevelSelect) courseLevelSelect.value = '';
    
    if (typeof searchCourses === 'function') {
        searchCourses();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const searchResourcesBtn = document.getElementById('searchResourcesBtn');
    if (searchResourcesBtn) {
        searchResourcesBtn.addEventListener('click', function() {
            if (typeof searchResources === 'function') {
                searchResources();
            }
        });
    }
    
    const resetSearchBtn = document.getElementById('resetCourseSearchBtn');
    if (resetSearchBtn) {
        resetSearchBtn.addEventListener('click', resetCourseSearch);
    }
    
    const searchCoursesBtn = document.getElementById('searchCoursesBtn');
    if (searchCoursesBtn) {
        searchCoursesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof searchCourses === 'function') {
                searchCourses();
            }
        });
    }
    
    const orderCalculateBtn = document.getElementById('orderCalculateBtn');
    if (orderCalculateBtn) {
        orderCalculateBtn.addEventListener('click', function() {
            if (typeof calculateOrderPrice === 'function') {
                calculateOrderPrice();
            }
        });
    }
    
    const orderSubmitBtn = document.getElementById('orderSubmitBtn');
    if (orderSubmitBtn) {
        orderSubmitBtn.addEventListener('click', function() {
            if (typeof submitOrder === 'function') {
                submitOrder();
            }
        });
    }
    
    const mapSearchInput = document.getElementById('map-search');
    if (mapSearchInput) {
        mapSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof searchResources === 'function') {
                    searchResources();
                }
            }
        });
    }
    
    const resourceTypeSelect = document.getElementById('resource-type');
    if (resourceTypeSelect) {
        resourceTypeSelect.addEventListener('change', function() {
            if (typeof filterResources === 'function') {
                filterResources();
            }
        });
    }
    
    const tutorLanguageSelect = document.getElementById('tutorLanguage');
    const tutorLevelSelect = document.getElementById('tutorLevel');
    const tutorExperienceSelect = document.getElementById('tutorExperience');
    
    if (tutorLanguageSelect) {
        tutorLanguageSelect.addEventListener('change', function() {
            if (typeof searchTutors === 'function') {
                searchTutors();
            }
        });
    }
    
    if (tutorLevelSelect) {
        tutorLevelSelect.addEventListener('change', function() {
            if (typeof searchTutors === 'function') {
                searchTutors();
            }
        });
    }
    
    if (tutorExperienceSelect) {
        tutorExperienceSelect.addEventListener('change', function() {
            if (typeof searchTutors === 'function') {
                searchTutors();
            }
        });
    }
    
    const courseSearchInput = document.getElementById('courseName');
    const courseLevelSelect = document.getElementById('courseLevel');
    
    if (courseSearchInput) {
        courseSearchInput.addEventListener('input', function() {
            setTimeout(function() {
                if (typeof searchCourses === 'function') {
                    searchCourses();
                }
            }, 300);
        });
    }
    
    if (courseLevelSelect) {
        courseLevelSelect.addEventListener('change', function() {
            if (typeof searchCourses === 'function') {
                searchCourses();
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const saveOrderBtn = document.getElementById('saveOrderChangesBtn');
    if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', function() {
            if (typeof saveOrderChanges === 'function') {
                saveOrderChanges();
            }
        });
    }
    
    const confirmDeleteBtn = document.getElementById('confirmDeleteOrderBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            if (typeof confirmDeleteOrder === 'function') {
                confirmDeleteOrder();
            }
        });
    }
});

window.resetCourseSearch = resetCourseSearch;