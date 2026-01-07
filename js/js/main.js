document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена');
    initPage();
    setupEventListeners();
});

let allCourses = [];
let allTutors = [];

async function initPage() {
    console.log('Инициализация страницы...');
    try {
        allCourses = await window.apiService.getAllCourses();
        allTutors = await window.apiService.getAllTutors();
        
        displayCourses(allCourses, 1);
        displayTutors(allTutors);
        loadLanguageFilter();
        
    } catch (error) {
        console.error('Ошибка при инициализации:', error);
        showNotification('error', 'Не удалось загрузить данные');
    }
}

function searchCourses() {
    const searchInput = document.getElementById('courseName');
    const levelSelect = document.getElementById('courseLevel');
    
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const level = levelSelect ? levelSelect.value : '';
    
    let filteredCourses = [...allCourses];
    
    if (searchQuery) {
        filteredCourses = filteredCourses.filter(course => 
            course.name.toLowerCase().includes(searchQuery) ||
            (course.description && course.description.toLowerCase().includes(searchQuery)) ||
            (course.teacher && course.teacher.toLowerCase().includes(searchQuery))
        );
    }
    
    if (level) {
        filteredCourses = filteredCourses.filter(course => 
            course.level === level
        );
    }
    
    displayCourses(filteredCourses, 1);
}

function displayCourses(courses, page) {
    const coursesContainer = document.getElementById('courses-container');
    
    if (!coursesContainer) return;
    
    coursesContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
        </div>
    `;
    
    const coursesPerPage = 5;
    const startIndex = (page - 1) * coursesPerPage;
    const endIndex = startIndex + coursesPerPage;
    const paginatedCourses = courses.slice(startIndex, endIndex);
    const totalPages = Math.ceil(courses.length / coursesPerPage);
    
    coursesContainer.innerHTML = '';
    
    if (paginatedCourses.length === 0) {
        coursesContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search fs-1 text-muted"></i>
                <h4 class="mt-3">Курсы не найдены</h4>
                <p class="text-muted">Попробуйте изменить параметры поиска</p>
            </div>
        `;
    } else {
        paginatedCourses.forEach(course => {
            const courseCard = createCourseCard(course);
            coursesContainer.appendChild(courseCard);
        });
    }
    
    updateCoursesPagination(page, totalPages);
}

function createCourseCard(course) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    const maxDescriptionLength = 100;
    let shortDescription = course.description || '';
    if (shortDescription.length > maxDescriptionLength) {
        shortDescription = shortDescription.substring(0, maxDescriptionLength) + '...';
    }
    
    col.innerHTML = `
        <div class="card h-100 shadow-sm border-success">
            <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-success">${course.level}</span>
                    <small class="text-muted">
                        ${course.total_length || 0} нед. × ${course.week_length || 0} ч/нед
                    </small>
                </div>
                
                <h5 class="card-title">${course.name}</h5>
                
                <p class="card-text flex-grow-1">${shortDescription}</p>
                
                <div class="mt-auto">
                    <p class="mb-1">
                        <small class="text-muted">Преподаватель:</small><br>
                        <strong>${course.teacher || 'Не указан'}</strong>
                    </p>
                    
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="h5 text-success mb-0">
                            ${course.course_fee_per_hour || 0} ₽/час
                        </span>
                        <button class="btn btn-success" onclick="openCourseOrderModal(${course.id})">
                            <i class="bi bi-cart-plus me-1"></i>Заявка
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

function updateCoursesPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('courses-pagination');
    
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHTML += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link" onclick="loadCoursesPage(${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>
                &laquo;
            </button>
        </li>
    `;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage ? 'active' : '';
        paginationHTML += `
            <li class="page-item ${active}">
                <button class="page-link" onclick="loadCoursesPage(${i})">${i}</button>
            </li>
        `;
    }
    
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHTML += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link" onclick="loadCoursesPage(${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>
                &raquo;
            </button>
        </li>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

function loadCoursesPage(page) {
    const searchInput = document.getElementById('courseName');
    const levelSelect = document.getElementById('courseLevel');
    
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const level = levelSelect ? levelSelect.value : '';
    
    let filteredCourses = [...allCourses];
    
    if (searchQuery) {
        filteredCourses = filteredCourses.filter(course => 
            course.name.toLowerCase().includes(searchQuery) ||
            (course.description && course.description.toLowerCase().includes(searchQuery)) ||
            (course.teacher && course.teacher.toLowerCase().includes(searchQuery))
        );
    }
    
    if (level) {
        filteredCourses = filteredCourses.filter(course => 
            course.level === level
        );
    }
    
    displayCourses(filteredCourses, page);
}

async function loadLanguageFilter() {
    try {
        const languagesSelect = document.getElementById('tutorLanguage');
        if (!languagesSelect || !allTutors.length) return;
        
        const allLanguages = new Set();
        allTutors.forEach(tutor => {
            if (tutor.languages_offered && Array.isArray(tutor.languages_offered)) {
                tutor.languages_offered.forEach(lang => {
                    if (lang && typeof lang === 'string') {
                        allLanguages.add(lang.trim());
                    }
                });
            }
        });
        
        const sortedLanguages = Array.from(allLanguages).sort();
        
        languagesSelect.innerHTML = '<option value="">Все языки</option>';
        sortedLanguages.forEach(language => {
            const option = document.createElement('option');
            option.value = language;
            option.textContent = language;
            languagesSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Ошибка при загрузке языков:', error);
    }
}

function searchTutors() {
    const languageSelect = document.getElementById('tutorLanguage');
    const levelSelect = document.getElementById('tutorLevel');
    const experienceSelect = document.getElementById('tutorExperience');
    
    const language = languageSelect ? languageSelect.value : '';
    const level = levelSelect ? levelSelect.value : '';
    const minExperience = experienceSelect ? parseInt(experienceSelect.value) : 0;
    
    let filteredTutors = [...allTutors];
    
    if (language) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.languages_offered && 
            tutor.languages_offered.some(lang => lang === language)
        );
    }
    
    if (level) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.language_level === level
        );
    }
    
    if (minExperience > 0) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.work_experience >= minExperience
        );
    }
    
    displayTutors(filteredTutors);
}

function displayTutors(tutors) {
    const tutorsContainer = document.getElementById('tutors-container');
    if (!tutorsContainer) return;
    
    tutorsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
        </div>
    `;
    
    tutorsContainer.innerHTML = '';
    
    if (tutors.length === 0) {
        tutorsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-person-x fs-1 text-muted"></i>
                <h4 class="mt-3">Репетиторы не найдены</h4>
                <p class="text-muted">Попробуйте изменить параметры поиска</p>
            </div>
        `;
        return;
    }
    
    const table = createTutorsTable(tutors);
    tutorsContainer.appendChild(table);
}

function createTutorsTable(tutors) {
    const container = document.createElement('div');
    container.className = 'col-12';
    
    const tableHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Фото</th>
                        <th>Имя репетитора</th>
                        <th>Уровень языка</th>
                        <th>Языки преподавания</th>
                        <th>Опыт (лет)</th>
                        <th>Ставка (руб./час)</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody id="tutors-table-body">
                    ${tutors.map(tutor => `
                        <tr id="tutor-row-${tutor.id}" 
                            onclick="selectTutor(${tutor.id})"
                            style="cursor: pointer;">
                            <td>
    <div class="rounded-circle bg-secondary d-flex align-items-center justify-content-center" 
         style="width: 40px; height: 40px;">
        <span class="text-white fw-bold">
            ${tutor.name ? tutor.name.charAt(0).toUpperCase() : '?'}
        </span>
    </div>
</td>
                            <td>
                                <strong>${tutor.name || 'Не указано'}</strong>
                            </td>
                            <td>
                                <span class="badge bg-secondary">
                                    ${tutor.language_level || 'Не указан'}
                                </span>
                            </td>
                            <td>
                                ${(tutor.languages_offered && Array.isArray(tutor.languages_offered) ? 
                                    tutor.languages_offered.map(lang => 
                                        `<span class="badge bg-success me-1 mb-1">${lang}</span>`
                                    ).join('') : 
                                    '<span class="text-muted">Не указаны</span>')}
                            </td>
                            <td>
                                ${tutor.work_experience || 0}
                            </td>
                            <td>
                                <span class="fw-bold text-primary">
                                    ${tutor.price_per_hour || 0}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-outline-primary btn-sm"
                                        onclick="event.stopPropagation(); openTutorOrderModal(${tutor.id})">
                                    <i class="bi bi-cart-plus"></i> Заявка
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
    return container;
}

function selectTutor(tutorId) {
    const allRows = document.querySelectorAll('#tutors-table-body tr');
    allRows.forEach(row => {
        row.classList.remove('table-primary', 'selected');
        row.style.backgroundColor = '';
    });
    
    const selectedRow = document.getElementById(`tutor-row-${tutorId}`);
    if (selectedRow) {
        selectedRow.classList.add('table-primary', 'selected');
        selectedRow.style.backgroundColor = '#e7f1ff';
        
        showNotification('info', `Выбран репетитор: ${selectedRow.querySelector('strong').textContent}`);
    }
}

function updateAvailableTimes() {
    const dateSelect = document.getElementById('orderStartDate');
    const timeSelect = document.getElementById('orderTimeStart');
    const courseId = document.getElementById('orderCourseId').value;
    const orderType = document.getElementById('orderType').value;
    
    if (!dateSelect.value) {
        timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
        timeSelect.disabled = true;
        return;
    }
    
    timeSelect.disabled = false;
    
    const availableTimes = [
        '09:00', '10:00', '11:00', '12:00', 
        '13:00', '14:00', '15:00', '16:00', 
        '17:00', '18:00', '19:00', '20:00'
    ];
    
    timeSelect.innerHTML = '<option value="">Выберите время...</option>';
    
    availableTimes.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        
        let displayText = time;
        if (orderType === 'course' && courseId) {
            const course = allCourses.find(c => c.id == courseId);
            if (course && course.week_length) {
                const [hours, minutes] = time.split(':').map(Number);
                const endHour = hours + (course.week_length || 1);
                const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                displayText = `${time} - ${endTime}`;
            }
        }
        
        option.textContent = displayText;
        timeSelect.appendChild(option);
    });
    
    updateCourseEndDate();
}

function updateCourseEndDate() {
    const dateStart = document.getElementById('orderStartDate').value;
    const courseId = document.getElementById('orderCourseId').value;
    const orderType = document.getElementById('orderType').value;
    
    if (!dateStart) {
        document.getElementById('orderEndDate').value = '';
        document.getElementById('orderEndDateDisplay').textContent = 'Дата окончания';
        return;
    }
    
    if (orderType === 'course' && courseId) {
        const course = allCourses.find(c => c.id == courseId);
        if (course && course.total_length) {
            const totalWeeks = course.total_length;
            const startDate = new Date(dateStart + 'T00:00:00');
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + (totalWeeks * 7));
            
            const endDateStr = endDate.toISOString().split('T')[0];
            document.getElementById('orderEndDate').value = endDateStr;
            
            const formattedDate = endDate.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            document.getElementById('orderEndDateDisplay').textContent = formattedDate;
        }
    }
}

function getSelectedOptions() {
    return {
        early_registration: document.getElementById('autoEarlyRegistration').checked,
        group_enrollment: document.getElementById('autoGroupEnrollment').checked,
        intensive_course: document.getElementById('autoIntensiveCourse').checked,
        supplementary: document.getElementById('optionSupplementary').checked,
        personalized: document.getElementById('optionPersonalized').checked,
        excursions: document.getElementById('optionExcursions').checked,
        assessment: document.getElementById('optionAssessment').checked,
        interactive: document.getElementById('optionInteractive').checked
    };
}

function checkAutomaticOptions(dateStart, persons, course) {
    const orderType = document.getElementById('orderType').value;
    
    if (dateStart) {
        const startDate = new Date(dateStart);
        const today = new Date();
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(today.getMonth() + 1);
        
        const earlyRegistrationCheckbox = document.getElementById('autoEarlyRegistration');
        if (earlyRegistrationCheckbox) {
            earlyRegistrationCheckbox.checked = startDate > monthFromNow;
        }
    }
    
    const groupEnrollmentCheckbox = document.getElementById('autoGroupEnrollment');
    if (groupEnrollmentCheckbox) {
        groupEnrollmentCheckbox.checked = persons >= 5;
    }
    
    const intensiveCourseCheckbox = document.getElementById('autoIntensiveCourse');
    if (intensiveCourseCheckbox) {
        if (orderType === 'course' && course) {
            intensiveCourseCheckbox.checked = course.week_length >= 5;
        } else if (orderType === 'tutor') {
            const durationHours = parseInt(document.getElementById('orderDurationHours').value) || 1;
            intensiveCourseCheckbox.checked = durationHours >= 10;
        } else {
            intensiveCourseCheckbox.checked = false;
        }
    }
    
    const intensiveLabel = document.querySelector('label[for="autoIntensiveCourse"]');
    if (intensiveLabel) {
        if (orderType === 'course') {
            intensiveLabel.innerHTML = 'Интенсивный курс (надбавка 20%)';
        } else if (orderType === 'tutor') {
            intensiveLabel.innerHTML = 'Интенсивные занятия (надбавка 20%)';
        }
    }
}

async function calculateOrderPrice() {
    try {
        const orderType = document.getElementById('orderType').value;
        const courseId = document.getElementById('orderCourseId').value;
        const tutorId = document.getElementById('orderTutorId').value;
        const dateStart = document.getElementById('orderStartDate').value;
        const timeStart = document.getElementById('orderTimeStart').value;
        const persons = parseInt(document.getElementById('orderPersons').value) || 1;
        
        let durationHours = 1;
        if (orderType === 'tutor') {
            durationHours = parseInt(document.getElementById('orderDurationHours').value) || 1;
        }
        
        if (!dateStart || !timeStart) {
            showNotification('error', 'Выберите дату и время начала');
            return;
        }
        
        if (persons < 1 || persons > 20) {
            showNotification('error', 'Количество студентов должно быть от 1 до 20');
            return;
        }
        
        if (orderType === 'tutor' && (durationHours < 1 || durationHours > 40)) {
            showNotification('error', 'Продолжительность должна быть от 1 до 40 часов');
            return;
        }
        
        let calculatedDuration = 0;
        
        const options = getSelectedOptions();
        
        if (orderType === 'course' && courseId) {
            const course = await window.apiService.getCourseById(courseId);
            if (!course) {
                showNotification('error', 'Курс не найден');
                return;
            }
            
            checkAutomaticOptions(dateStart, persons, course);
            
            const totalPrice = window.apiService.calculateCoursePrice(
                course, 
                dateStart, 
                timeStart, 
                persons, 
                options
            );
            
            const totalHours = (course.total_length || 0) * (course.week_length || 0);
            calculatedDuration = totalHours;
            const details = `${course.course_fee_per_hour} ₽/час × ${totalHours} часов`;
            document.getElementById('orderPriceDetails').textContent = details;
            
            document.getElementById('orderCalculatedPrice').value = totalPrice;
            document.getElementById('orderCalculatedDuration').value = calculatedDuration;
            document.getElementById('orderTotalPriceDisplay').textContent = 
                new Intl.NumberFormat('ru-RU', { 
                    style: 'currency', 
                    currency: 'RUB',
                    minimumFractionDigits: 0 
                }).format(totalPrice);
            
        } else if (orderType === 'tutor' && tutorId) {
            const tutor = await window.apiService.getTutorById(tutorId);
            if (!tutor) {
                showNotification('error', 'Репетитор не найден');
                return;
            }
            
            checkAutomaticOptions(dateStart, persons, null);
            
            const totalPrice = window.apiService.calculateTutorPrice(
                tutor,
                durationHours,
                dateStart,
                timeStart,
                persons,
                options
            );
            
            calculatedDuration = durationHours;
            const details = `${tutor.price_per_hour} ₽/час × ${durationHours} часов`;
            document.getElementById('orderPriceDetails').textContent = details;
            
            document.getElementById('orderCalculatedPrice').value = totalPrice;
            document.getElementById('orderCalculatedDuration').value = calculatedDuration;
            document.getElementById('orderTotalPriceDisplay').textContent = 
                new Intl.NumberFormat('ru-RU', { 
                    style: 'currency', 
                    currency: 'RUB',
                    minimumFractionDigits: 0 
                }).format(totalPrice);
        } else {
            showNotification('error', 'Не выбран курс или репетитор');
            return;
        }
        
        document.getElementById('orderCalculateBtn').classList.add('display-none');
        document.getElementById('orderSubmitBtn').classList.remove('display-none');
        
        updateDiscountsDisplay(options);
        
    } catch (error) {
        showNotification('error', 'Ошибка расчета стоимости: ' + error.message);
    }
}

function updateDiscountsDisplay(options) {
    const discountsContainer = document.getElementById('orderDiscounts');
    
    if (!options.early_registration && !options.group_enrollment && !options.intensive_course &&
        !options.excursions && !options.interactive && !options.supplementary && 
        !options.personalized && !options.assessment) {
        discountsContainer.classList.add('display-none');
        return;
    }
    
    let discountsHTML = '<h6 class="mb-2">Примененные опции:</h6><div class="row">';
    let appliedDiscounts = [];
    
    if (options.early_registration) {
        appliedDiscounts.push({ name: 'Ранняя регистрация', value: '-10%', type: 'discount' });
    }
    if (options.group_enrollment) {
        appliedDiscounts.push({ name: 'Групповая запись', value: '-15%', type: 'discount' });
    }
    if (options.intensive_course) {
        appliedDiscounts.push({ name: 'Интенсивный курс', value: '+20%', type: 'surcharge' });
    }
    if (options.excursions) {
        appliedDiscounts.push({ name: 'Культурные экскурсии', value: '+25%', type: 'surcharge' });
    }
    if (options.interactive) {
        appliedDiscounts.push({ name: 'Интерактивная платформа', value: '+50%', type: 'surcharge' });
    }
    if (options.supplementary) {
        appliedDiscounts.push({ name: 'Доп. материалы', value: '+2000 ₽/чел', type: 'surcharge' });
    }
    if (options.personalized) {
        appliedDiscounts.push({ name: 'Индивид. занятия', value: '+1500 ₽/нед', type: 'surcharge' });
    }
    if (options.assessment) {
        appliedDiscounts.push({ name: 'Оценка уровня', value: '+300 ₽', type: 'surcharge' });
    }
    
    const half = Math.ceil(appliedDiscounts.length / 2);
    
    discountsHTML += '<div class="col-md-6">';
    for (let i = 0; i < half; i++) {
        const badgeClass = appliedDiscounts[i].type === 'discount' ? 'bg-success' : 'bg-warning';
        discountsHTML += `
            <div class="d-flex align-items-center mb-1">
                <span class="badge ${badgeClass} me-2">${appliedDiscounts[i].value}</span>
                <small>${appliedDiscounts[i].name}</small>
            </div>
        `;
    }
    discountsHTML += '</div><div class="col-md-6">';
    for (let i = half; i < appliedDiscounts.length; i++) {
        const badgeClass = appliedDiscounts[i].type === 'discount' ? 'bg-success' : 'bg-warning';
        discountsHTML += `
            <div class="d-flex align-items-center mb-1">
                <span class="badge ${badgeClass} me-2">${appliedDiscounts[i].value}</span>
                <small>${appliedDiscounts[i].name}</small>
            </div>
        `;
    }
    discountsHTML += '</div></div>';
    
    discountsContainer.innerHTML = discountsHTML;
    discountsContainer.classList.remove('display-none');
}

async function openCourseOrderModal(courseId) {
    try {
        const course = await window.apiService.getCourseById(courseId);
        if (!course) {
            showNotification('error', 'Курс не найден');
            return;
        }
        resetOrderForm();
        
        document.getElementById('orderCourseName').value = course.name;
        document.getElementById('orderCourseId').value = course.id;
        document.getElementById('orderType').value = 'course';
        document.getElementById('orderTeacherName').value = course.teacher || 'Преподаватель не указан';
        
        const totalHours = course.total_length * course.week_length;
        document.getElementById('orderCourseDuration').value = `${course.total_length} недель (${course.week_length} ч/нед)`;
        document.getElementById('orderDurationInfo').textContent = `Всего часов: ${totalHours} ч`;
        
        document.getElementById('tutorLanguageContainer').style.display = 'none';
        document.getElementById('durationHoursContainer').style.display = 'none';
        document.getElementById('orderEndDateDisplay').style.display = 'block';
        
        const dateSelect = document.getElementById('orderStartDate');
        dateSelect.innerHTML = '<option value="">Выберите дату...</option>';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (course.start_dates && Array.isArray(course.start_dates) && course.start_dates.length > 0) {
            const uniqueDates = new Set();
            const futureDates = [];
            
            course.start_dates.forEach(dateStr => {
                try {
                    const dateOnly = dateStr.split('T')[0];
                    if (!uniqueDates.has(dateOnly)) {
                        uniqueDates.add(dateOnly);
                        const date = new Date(dateOnly + 'T00:00:00');
                        if (date && !isNaN(date.getTime()) && date >= today) {
                            futureDates.push({
                                date: date,
                                dateStr: dateOnly
                            });
                        }
                    }
                } catch {
                    // игнорируем ошибки парсинга даты
                }
            });
            
            futureDates.sort((a, b) => a.date - b.date);
            
            if (futureDates.length > 0) {
                futureDates.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.dateStr;
                    
                    const formattedDate = item.date.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        weekday: 'short'
                    });
                    option.textContent = formattedDate;
                    
                    dateSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Нет доступных дат';
                option.disabled = true;
                dateSelect.appendChild(option);
                dateSelect.disabled = true;
                showNotification('warning', 'Нет доступных дат для начала курса');
            }
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Даты не указаны';
            option.disabled = true;
            dateSelect.appendChild(option);
            dateSelect.disabled = true;
            showNotification('info', 'Даты начала курса не указаны в системе');
        }
        
        const timeSelect = document.getElementById('orderTimeStart');
        timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
        timeSelect.disabled = true;
        
        const modal = window.bootstrap ? new window.bootstrap.Modal(document.getElementById('orderModal')) : null;
        if (modal) {
            modal.show();
        } else {
            document.getElementById('orderModal').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Ошибка открытия формы курса:', error);
        showNotification('error', 'Не удалось загрузить данные курса');
    }
}

async function openTutorOrderModal(tutorId) {
    try {
        const tutor = await window.apiService.getTutorById(tutorId);
        if (!tutor) {
            showNotification('error', 'Репетитор не найден');
            return;
        }
        
        resetOrderForm();
        
        document.getElementById('orderCourseName').value = `Индивидуальные занятия с ${tutor.name}`;
        document.getElementById('orderTeacherName').value = tutor.name;
        document.getElementById('orderTutorId').value = tutor.id;
        document.getElementById('orderType').value = 'tutor';
        
        document.getElementById('tutorLanguageContainer').style.display = 'block';
        document.getElementById('orderTutorLanguage').value = 
            tutor.languages_offered && tutor.languages_offered.length > 0 
                ? tutor.languages_offered[0] 
                : 'Язык не указан';
        
        document.getElementById('durationHoursContainer').style.display = 'block';
        document.getElementById('orderCourseDuration').value = 'Индивидуальные занятия';
        document.getElementById('orderDurationInfo').textContent = '';
        
        document.getElementById('orderEndDateDisplay').style.display = 'none';
        
        const dateSelect = document.getElementById('orderStartDate');
        dateSelect.innerHTML = '<option value="">Выберите дату...</option>';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 1; i <= 90; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            if (date < today) continue;
            
            const option = document.createElement('option');
            option.value = date.toISOString().split('T')[0];
            
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                weekday: 'short'
            });
            option.textContent = formattedDate;
            
            dateSelect.appendChild(option);
        }
        
        const timeSelect = document.getElementById('orderTimeStart');
        timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
        timeSelect.disabled = true;
        
        const modal = window.bootstrap ? new window.bootstrap.Modal(document.getElementById('orderModal')) : null;
        if (modal) {
            modal.show();
        } else {
            document.getElementById('orderModal').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Ошибка открытия формы репетитора:', error);
        showNotification('error', 'Не удалось загрузить данные репетитора');
    }
}

function resetOrderForm() {
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.reset();
    }
    
    const fieldsToReset = [
        'orderCourseId', 'orderTutorId', 'orderType', 
        'orderCalculatedPrice', 'orderCalculatedDuration', 'orderEndDate'
    ];
    
    fieldsToReset.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
    
    const displayFields = [
        'orderTotalPriceDisplay', 'orderPriceDetails', 'orderDurationInfo'
    ];
    
    displayFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.textContent = fieldId === 'orderTotalPriceDisplay' ? '0 ₽' : '';
    });
    
    const endDateDisplay = document.getElementById('orderEndDateDisplay');
    if (endDateDisplay) {
        endDateDisplay.textContent = 'Дата окончания';
        endDateDisplay.style.display = 'block';
    }
    
    const timeSelect = document.getElementById('orderTimeStart');
    if (timeSelect) {
        timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
        timeSelect.disabled = true;
    }
    
    document.querySelectorAll('.order-option').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    const autoOptions = ['autoEarlyRegistration', 'autoGroupEnrollment', 'autoIntensiveCourse'];
    autoOptions.forEach(optionId => {
        const option = document.getElementById(optionId);
        if (option) option.checked = false;
    });
    
    document.querySelectorAll('.card.bg-light').forEach(el => {
        el.style.display = 'block';
    });
    
    const tutorLangContainer = document.getElementById('tutorLanguageContainer');
    const durationContainer = document.getElementById('durationHoursContainer');
    if (tutorLangContainer) tutorLangContainer.classList.add('display-none');
    if (durationContainer) durationContainer.classList.add('display-none');
    
    const discountsContainer = document.getElementById('orderDiscounts');
    if (discountsContainer) {
        discountsContainer.innerHTML = '';
        discountsContainer.classList.add('display-none');
    }
    
    const calculateBtn = document.getElementById('orderCalculateBtn');
    const submitBtn = document.getElementById('orderSubmitBtn');
    if (calculateBtn) {
        calculateBtn.classList.remove('display-none');
    }
    if (submitBtn) {
        submitBtn.classList.add('display-none');
        submitBtn.innerHTML = '<i class="bi bi-send me-1"></i>Отправить заявку';
        submitBtn.disabled = false;
    }
}
async function submitOrder() {
    try {
        const orderType = document.getElementById('orderType').value;
        const courseId = document.getElementById('orderCourseId').value;
        const tutorId = document.getElementById('orderTutorId').value;
        const price = document.getElementById('orderCalculatedPrice').value;
        const dateStart = document.getElementById('orderStartDate').value;
        const timeStart = document.getElementById('orderTimeStart').value;
        const persons = document.getElementById('orderPersons').value;
        const calculatedDuration = document.getElementById('orderCalculatedDuration').value;
        
        try {
            const currentOrders = await window.apiService.getAllOrders();
            if (currentOrders.length >= 10) {
                showNotification('error', 'Достигнут лимит заявок (максимум 10). Удалите старые заявки в личном кабинете.');
                return;
            }
        } catch {
            // Игнорируем ошибку проверки лимита
        }
        
        if (!price || price === '0' || price === '') {
            showNotification('error', 'Сначала рассчитайте стоимость');
            return;
        }
        
        if (!dateStart) {
            showNotification('error', 'Выберите дату начала');
            return;
        }
        
        if (!timeStart) {
            showNotification('error', 'Выберите время начала');
            return;
        }
        
        const options = getSelectedOptions();
        
        const orderData = {
            date_start: dateStart,
            time_start: timeStart,
            persons: parseInt(persons),
            price: parseInt(price),
            early_registration: options.early_registration,
            group_enrollment: options.group_enrollment,
            intensive_course: options.intensive_course,
            supplementary: options.supplementary,
            personalized: options.personalized,
            excursions: options.excursions,
            assessment: options.assessment,
            interactive: options.interactive
        };
        
        if (orderType === 'course' && courseId) {
            orderData.course_id = parseInt(courseId);
            orderData.duration = parseInt(calculatedDuration) || 1;
            
        } else if (orderType === 'tutor' && tutorId) {
            const durationHours = parseInt(document.getElementById('orderDurationHours').value) || 1;
            orderData.tutor_id = parseInt(tutorId);
            orderData.duration = durationHours;
            
        } else {
            showNotification('error', 'Не выбран курс или репетитор');
            return;
        }
        
        const submitBtn = document.getElementById('orderSubmitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Отправка...';
        submitBtn.disabled = true;
        
        await window.apiService.createOrder(orderData);
        
        const orderModal = document.getElementById('orderModal');
        const modalInstance = window.bootstrap ? window.bootstrap.Modal.getInstance(orderModal) : null;
        if (modalInstance) {
            modalInstance.hide();
        } else {
            orderModal.style.display = 'none';
        }
        
        resetOrderForm();
        
        showNotification('success', 'Заявка успешно создана!');
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        let errorMessage = 'Ошибка при создании заявки';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Ошибка подключения к серверу. Проверьте интернет-соединение.';
        } else if (error.message.includes('400')) {
            errorMessage = 'Ошибка валидации данных. Проверьте введенные данные.';
        } else if (error.message.includes('422')) {
            errorMessage = 'Ошибка данных: ' + error.message;
        } else if (error.message.includes('Поле duration не может быть пустым')) {
            errorMessage = 'Ошибка: поле продолжительность (duration) обязательно';
        } else if (error.message.includes('Не указан ни курс, ни репетитор')) {
            errorMessage = 'Выберите курс или репетитора';
        } else {
            errorMessage = error.message;
        }
        
        showNotification('error', errorMessage);
        
        const submitBtn = document.getElementById('orderSubmitBtn');
        submitBtn.innerHTML = '<i class="bi bi-send me-1"></i>Отправить заявку';
        submitBtn.disabled = false;
    }
}

function showNotification(type, message) {
    const area = document.getElementById('notification-area');
    if (!area) {
        console.log(`${type}: ${message}`);
        return;
    }
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    area.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function setupEventListeners() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            searchCourses();
        });
    }
    
    const courseSearchInput = document.getElementById('courseName');
    const courseLevelSelect = document.getElementById('courseLevel');
    
    if (courseSearchInput) {
        courseSearchInput.addEventListener('input', function() {
            setTimeout(searchCourses, 300);
        });
    }
    
    if (courseLevelSelect) {
        courseLevelSelect.addEventListener('change', searchCourses);
    }
    
    const tutorLanguageSelect = document.getElementById('tutorLanguage');
    const tutorLevelSelect = document.getElementById('tutorLevel');
    const tutorExperienceSelect = document.getElementById('tutorExperience');
    
    if (tutorLanguageSelect) {
        tutorLanguageSelect.addEventListener('change', searchTutors);
    }
    
    if (tutorLevelSelect) {
        tutorLevelSelect.addEventListener('change', searchTutors);
    }
    
    if (tutorExperienceSelect) {
        tutorExperienceSelect.addEventListener('change', searchTutors);
    }
    
    const orderStartDate = document.getElementById('orderStartDate');
    if (orderStartDate) {
        orderStartDate.addEventListener('change', function() {
            updateAvailableTimes();
        });
    }
    
    const orderTimeStart = document.getElementById('orderTimeStart');
    if (orderTimeStart) {
        orderTimeStart.addEventListener('change', function() {
            if (this.value) {
                calculateOrderPrice();
            }
        });
    }
    
    const orderPersons = document.getElementById('orderPersons');
    if (orderPersons) {
        orderPersons.addEventListener('input', calculateOrderPrice);
    }
    
    const durationHours = document.getElementById('orderDurationHours');
    if (durationHours) {
        durationHours.addEventListener('input', function() {
            updateCourseEndDate();
            calculateOrderPrice();
        });
    }
    
    document.querySelectorAll('.order-option').forEach(checkbox => {
        checkbox.addEventListener('change', calculateOrderPrice);
    });
    
    const orderModal = document.getElementById('orderModal');
    if (orderModal) {
        orderModal.addEventListener('hidden.bs.modal', resetOrderForm);
    }
}

window.openCourseOrderModal = openCourseOrderModal;
window.openTutorOrderModal = openTutorOrderModal;
window.selectTutor = selectTutor;
window.searchCourses = searchCourses;
window.searchTutors = searchTutors;
window.loadCoursesPage = loadCoursesPage;
window.calculateOrderPrice = calculateOrderPrice;
window.submitOrder = submitOrder;
window.updateAvailableTimes = updateAvailableTimes;