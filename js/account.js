let currentOrderId = null;
let currentPage = 1;
let allOrders = [];
const apiService = window.apiService || {};
const bootstrap = window.bootstrap || {};

if (!bootstrap.Modal) {
    bootstrap.Modal = class {
        constructor(element) {
            this.element = element;
        }
        show() {
            this.element.style.display = 'block';
        }
        hide() {
            this.element.style.display = 'none';
        }
        static getInstance(element) {
            return new bootstrap.Modal(element);
        }
    };
}

document.addEventListener('DOMContentLoaded', function() {
    initAccountPage();
    setupAccountEventListeners();
});

async function initAccountPage() {
    try {
        await loadOrders(currentPage);
    } catch (error) {
        console.error('Ошибка при инициализации личного кабинета:', error);
        showNotification('error', 'Не удалось загрузить данные');
    }
}

async function loadOrders(page = 1) {
    try {
        const tableBody = document.getElementById('orders-table-body');
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                </td>
            </tr>
        `;
        
        allOrders = await apiService.getAllOrders();
        
        const startIndex = (page - 1) * apiService.ordersPerPage;
        const paginatedOrders = allOrders.slice(
            startIndex, 
            startIndex + apiService.ordersPerPage
        );
        
        tableBody.innerHTML = '';
        
        if (paginatedOrders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <i class="bi bi-inbox fs-1 text-muted"></i>
                        <h4 class="mt-3">Заявки не найдены</h4>
                        <a href="index.html" class="btn btn-primary mt-2">
                            <i class="bi bi-plus-circle me-1"></i>Создать первую заявку
                        </a>
                    </td>
                </tr>
            `;
            return;
        }
        
        for (const order of paginatedOrders) {
            const rowNumber = startIndex + paginatedOrders.indexOf(order) + 1;
            const row = await createOrderRow(order, rowNumber);
            tableBody.appendChild(row);
        }
        
        updateOrdersPagination(page, Math.ceil(allOrders.length / apiService.ordersPerPage));
        
        currentPage = page;
        
    } catch (error) {
        console.error('Ошибка при загрузке заявок:', error);
        showNotification('error', 'Не удалось загрузить заявки');
        showFallbackOrders();
    }
}

async function createOrderRow(order, rowNumber) {
    const row = document.createElement('tr');
    
    try {
        let serviceName = '';
        let description = '';
        
        if (order.course_id) {
            const course = await apiService.getCourseById(order.course_id);
            if (course) {
                serviceName = course.name;
                description = course.description;
            } else {
                serviceName = 'Курс (информация не найдена)';
            }
        } else if (order.tutor_id) {
            const tutor = await apiService.getTutorById(order.tutor_id);
            if (tutor) {
                serviceName = `Индивидуальные занятия с ${tutor.name}`;
                description = `Репетитор: ${tutor.name}, Языки: ${tutor.languages_offered.join(', ')}, Уровень: ${tutor.language_level}`;
            } else {
                serviceName = 'Занятия с репетитором';
            }
        } else {
            serviceName = 'Неизвестная услуга';
        }
        
        const formattedDate = formatDate(order.date_start);
        
        const formattedPrice = new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(order.price);
        
        row.innerHTML = `
            <td>${rowNumber}</td>
            <td>
                <strong>${serviceName}</strong>
                <br>
                <small class="text-muted">${description.substring(0, 50)}${description.length > 50 ? '...' : ''}</small>
            </td>
            <td>
                ${formattedDate}
                <br>
                <small class="text-muted">${order.time_start}</small>
            </td>
            <td>
                <span class="fw-bold text-success">${formattedPrice}</span>
                <br>
                <small>${order.persons} студент(ов)</small>
            </td>
            <td>
                ${getOrderStatusBadge(order)}
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-success" 
                            onclick="showOrderDetails(${order.id})" 
                            title="Подробнее">
                        <i class="bi bi-info-circle"></i>
                    </button>
                    <button type="button" class="btn btn-outline-warning" 
                            onclick="editOrder(${order.id})"
                            title="Изменить">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" 
                            onclick="confirmOrderDelete(${order.id})"
                            title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        row.dataset.orderId = order.id;
        row.dataset.serviceName = serviceName;
        row.dataset.description = description;
        
    } catch (error) {
        console.error('Ошибка создания строки заявки:', error);
        row.innerHTML = `
            <td>${rowNumber}</td>
            <td colspan="5" class="text-muted">
                <i class="bi bi-exclamation-triangle me-1"></i>
                Ошибка загрузки данных заявки
            </td>
        `;
    }
    
    return row;
}

async function showOrderDetails(orderId) {
    try {
        currentOrderId = orderId;
        
        const order = await apiService.getOrderById(orderId);
        if (!order) {
            showNotification('error', 'Заявка не найдена');
            return;
        }
        
        let serviceDetails = '';
        
        if (order.course_id) {
            const course = await apiService.getCourseById(order.course_id);
            if (course) {
                serviceDetails = `
                    <h6>Курс: ${course.name}</h6>
                    <p class="mb-2">${course.description}</p>
                    <p><strong>Преподаватель:</strong> ${course.teacher}</p>
                    <p><strong>Уровень:</strong> ${course.level}</p>
                    <p><strong>Продолжительность:</strong> ${course.total_length} недель × ${course.week_length} ч/нед</p>
                `;
            }
        } else if (order.tutor_id) {
            const tutor = await apiService.getTutorById(order.tutor_id);
            if (tutor) {
                serviceDetails = `
                    <h6>Индивидуальные занятия</h6>
                    <p><strong>Репетитор:</strong> ${tutor.name}</p>
                    <p><strong>Уровень языка:</strong> ${tutor.language_level}</p>
                    <p><strong>Языки преподавания:</strong> ${tutor.languages_offered.join(', ')}</p>
                    <p><strong>Опыт:</strong> ${tutor.work_experience} лет</p>
                `;
            }
        }
        
        const startDate = formatDate(order.date_start);
        const endDate = order.date_end ? formatDate(order.date_end) : 'Не указана';
        
        const detailsContent = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Основная информация</h6>
                    <ul class="list-unstyled">
                        <li><strong>Дата начала:</strong> ${startDate}</li>
                        <li><strong>Время:</strong> ${order.time_start}</li>
                        <li><strong>Дата окончания:</strong> ${endDate}</li>
                        <li><strong>Количество студентов:</strong> ${order.persons}</li>
                        <li><strong>Общая стоимость:</strong> ${formatPrice(order.price)}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    ${serviceDetails}
                </div>
            </div>
            
            <hr>
            
            <h6>Примененные опции</h6>
            <div class="row">
                <div class="col-md-12">
                    ${generateOptionsList(order)}
                </div>
            </div>
            
            <hr>
            
            <div class="alert alert-info">
                <small>
                    <i class="bi bi-info-circle me-1"></i>
                    Заявка создана: ${formatDate(order.created_at || new Date().toISOString())}
                </small>
            </div>
        `;
        
        document.getElementById('orderDetailsContent').innerHTML = detailsContent;
        
        const detailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
        detailsModal.show();
        
    } catch (error) {
        console.error('Ошибка при показе деталей заявки:', error);
        showNotification('error', 'Не удалось загрузить детали заявки');
    }
}

async function editOrder(orderId) {
    try {
        currentOrderId = orderId;
        
        const order = await apiService.getOrderById(orderId);
        
        if (!order) {
            showNotification('error', 'Заявка не найдена');
            return;
        }
        
        document.getElementById('editDateStart').value = order.date_start;
        document.getElementById('editTimeStart').value = order.time_start;
        document.getElementById('editPersons').value = order.persons;
        
        document.getElementById('editSupplementary').checked = order.supplementary;
        document.getElementById('editPersonalized').checked = order.personalized;
        document.getElementById('editExcursions').checked = order.excursions;
        document.getElementById('editAssessment').checked = order.assessment;
        document.getElementById('editInteractive').checked = order.interactive;
        
        const earlyRegCheckbox = document.getElementById('editEarlyRegistration');
        const groupEnrollCheckbox = document.getElementById('editGroupEnrollment');
        const intensiveCheckbox = document.getElementById('editIntensiveCourse');
        
        earlyRegCheckbox.checked = order.early_registration;
        earlyRegCheckbox.disabled = true;
        
        groupEnrollCheckbox.checked = order.group_enrollment;
        groupEnrollCheckbox.disabled = true;
        
        intensiveCheckbox.checked = order.intensive_course;
        intensiveCheckbox.disabled = true;
        
        const earlyRegLabel = document.querySelector('label[for="editEarlyRegistration"]');
        if (earlyRegLabel) {
            earlyRegLabel.innerHTML += ' <small class="text-muted">(автоматически)</small>';
        }
        
        const groupEnrollLabel = document.querySelector('label[for="editGroupEnrollment"]');
        if (groupEnrollLabel) {
            groupEnrollLabel.innerHTML += ' <small class="text-muted">(автоматически)</small>';
        }
        
        const intensiveLabel = document.querySelector('label[for="editIntensiveCourse"]');
        if (intensiveLabel) {
            intensiveLabel.innerHTML += ' <small class="text-muted">(автоматически)</small>';
        }
        
        let courseInfo = '';
        
        if (order.course_id) {
            try {
                const course = await apiService.getCourseById(order.course_id);
                if (course) {
                    courseInfo = `
                        <strong>${course.name}</strong><br>
                        <small class="text-muted">${course.teacher} • ${course.level}</small>
                    `;
                }
            } catch {
                courseInfo = '<span class="text-muted">Курс</span>';
            }
        } else if (order.tutor_id) {
            try {
                const tutor = await apiService.getTutorById(order.tutor_id);
                if (tutor) {
                    courseInfo = `
                        <strong>Индивидуальные занятия</strong><br>
                        <small class="text-muted">Репетитор: ${tutor.name}</small>
                    `;
                }
            } catch {
                courseInfo = '<span class="text-muted">Репетитор</span>';
            }
        }
        
        document.getElementById('editCourseInfo').innerHTML = courseInfo;
        
        const editModal = new bootstrap.Modal(document.getElementById('orderEditModal'));
        editModal.show();
        
    } catch (error) {
        console.error('Ошибка при редактировании заявки:', error);
        showNotification('error', 'Не удалось загрузить данные заявки');
    }
}

async function saveOrderChanges() {
    try {
        if (!currentOrderId) {
            showNotification('error', 'ID заявки не указан');
            return;
        }
        
        try {
            const currentOrders = await apiService.getAllOrders();
            if (currentOrders.length >= 10) {
                showNotification('error', 'Достигнут лимит заявок (максимум 10)');
                return;
            }
        } catch {
            // Игнорируем ошибку проверки лимита
        }
        
        const originalOrder = await apiService.getOrderById(currentOrderId);
        if (!originalOrder) {
            showNotification('error', 'Заявка не найдена');
            return;
        }
        
        const updatedData = {
            date_start: document.getElementById('editDateStart').value,
            time_start: document.getElementById('editTimeStart').value,
            persons: parseInt(document.getElementById('editPersons').value),
            early_registration: originalOrder.early_registration,
            group_enrollment: originalOrder.group_enrollment,
            intensive_course: originalOrder.intensive_course,
            supplementary: document.getElementById('editSupplementary').checked,
            personalized: document.getElementById('editPersonalized').checked,
            excursions: document.getElementById('editExcursions').checked,
            assessment: document.getElementById('editAssessment').checked,
            interactive: document.getElementById('editInteractive').checked
        };
        
        if (!updatedData.date_start || !updatedData.time_start || !updatedData.persons) {
            showNotification('error', 'Заполните все обязательные поля');
            return;
        }
        
        if (updatedData.persons < 1 || updatedData.persons > 20) {
            showNotification('error', 'Количество студентов должно быть от 1 до 20');
            return;
        }
        
        if (originalOrder.course_id) {
            const course = await apiService.getCourseById(originalOrder.course_id);
            if (course) {
                const allOptions = {
                    early_registration: updatedData.early_registration,
                    group_enrollment: updatedData.group_enrollment,
                    intensive_course: updatedData.intensive_course,
                    supplementary: updatedData.supplementary,
                    personalized: updatedData.personalized,
                    excursions: updatedData.excursions,
                    assessment: updatedData.assessment,
                    interactive: updatedData.interactive
                };
                
                const newPrice = apiService.calculateCoursePrice(
                    course,
                    updatedData.date_start,
                    updatedData.time_start,
                    updatedData.persons,
                    allOptions
                );
                
                updatedData.price = newPrice;
            }
        } else if (originalOrder.tutor_id) {
            const tutor = await apiService.getTutorById(originalOrder.tutor_id);
            if (tutor) {
                const durationHours = originalOrder.duration || 1;
                
                const allOptions = {
                    early_registration: updatedData.early_registration,
                    group_enrollment: updatedData.group_enrollment,
                    intensive_course: updatedData.intensive_course,
                    supplementary: updatedData.supplementary,
                    personalized: updatedData.personalized,
                    excursions: updatedData.excursions,
                    assessment: updatedData.assessment,
                    interactive: updatedData.interactive
                };
                
                const newPrice = apiService.calculateTutorPrice(
                    tutor,
                    durationHours,
                    updatedData.date_start,
                    updatedData.time_start,
                    updatedData.persons,
                    allOptions
                );
                
                updatedData.price = newPrice;
            }
        }
        
        const saveBtn = document.getElementById('saveOrderChangesBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Сохранение...';
        saveBtn.disabled = true;
        
        await apiService.updateOrder(currentOrderId, updatedData);
        
        const editModal = bootstrap.Modal.getInstance(document.getElementById('orderEditModal'));
        editModal.hide();
        
        await loadOrders(currentPage);
        
        showNotification('success', 'Заявка успешно обновлена');

        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        currentOrderId = null;
        
    } catch (error) {
        console.error('Ошибка при обновлении заявки:', error);
        showNotification('error', `Ошибка при обновлении: ${error.message}`);
        const saveBtn = document.getElementById('saveOrderChangesBtn');
        saveBtn.innerHTML = 'Сохранить изменения';
        saveBtn.disabled = false;
    }
}
function confirmOrderDelete(orderId) {
    currentOrderId = orderId;
    
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    deleteModal.show();
}

async function confirmDeleteOrder() {
    try {
        if (!currentOrderId) {
            showNotification('error', 'ID заявки не указан');
            return;
        }
        
        const deleteBtn = document.getElementById('confirmDeleteOrderBtn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Удаление...';
        deleteBtn.disabled = true;
        
        await apiService.deleteOrder(currentOrderId);
        
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        deleteModal.hide();
        
        await loadOrders(currentPage);
        
        showNotification('success', 'Заявка успешно удалена');
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
        
        currentOrderId = null;
        
    } catch (error) {
        console.error('Ошибка при удалении заявки:', error);
        showNotification('error', `Ошибка при удалении: ${error.message}`);
        const deleteBtn = document.getElementById('confirmDeleteOrderBtn');
        deleteBtn.innerHTML = 'Да, удалить';
        deleteBtn.disabled = false;
    }
}

function formatDate(dateString) {
    if (!dateString) return '—';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function getOrderStatusBadge(order) {
    const today = new Date();
    const orderDate = new Date(order.date_start);
    
    let badgeClass = 'bg-success';
    let statusText = 'Активна';
    
    if (orderDate < today) {
        badgeClass = 'bg-secondary';
        statusText = 'Завершена';
    }
    
    if (!order.date_start) {
        badgeClass = 'bg-warning';
        statusText = 'Ожидает';
    }
    
    return `<span class="badge ${badgeClass}">${statusText}</span>`;
}

function generateOptionsList(order) {
    const options = [
        { id: 'supplementary', name: 'Дополнительные материалы', checked: order.supplementary, value: '+2000 ₽/чел' },
        { id: 'personalized', name: 'Индивидуальные занятия', checked: order.personalized, value: '+1500 ₽/нед' },
        { id: 'assessment', name: 'Оценка уровня', checked: order.assessment, value: '+300 ₽' },
        { id: 'early_registration', name: 'Ранняя регистрация', checked: order.early_registration, value: '-10%' },
        { id: 'group_enrollment', name: 'Групповая запись', checked: order.group_enrollment && order.persons >= 5, value: '-15%' },
        { id: 'intensive_course', name: 'Интенсивный курс', checked: order.intensive_course, value: '+20%' },
        { id: 'excursions', name: 'Культурные экскурсии', checked: order.excursions, value: '+25%' },
        { id: 'interactive', name: 'Интерактивная платформа', checked: order.interactive, value: '+50%' }
    ];
    
    let html = '<ul class="list-unstyled">';
    
    options.forEach(option => {
        if (option.checked) {
            html += `
                <li>
                    <i class="bi bi-check-circle text-success me-1"></i>
                    ${option.name} <span class="badge bg-light text-dark ms-1">${option.value}</span>
                </li>
            `;
        }
    });
    
    html += '</ul>';
    return html;
}

function updateOrdersPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('orders-pagination');
    
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHTML += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link" onclick="loadOrders(${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>
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
                <button class="page-link" onclick="loadOrders(${i})">${i}</button>
            </li>
        `;
    }
    
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHTML += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link" onclick="loadOrders(${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>
                &raquo;
            </button>
        </li>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

function setupAccountEventListeners() {
    const detailsModal = document.getElementById('orderDetailsModal');
    if (detailsModal) {
        detailsModal.addEventListener('hidden.bs.modal', function() {
            currentOrderId = null;
            document.getElementById('orderDetailsContent').innerHTML = '';
        });
    }
    
    const editModal = document.getElementById('orderEditModal');
    if (editModal) {
        editModal.addEventListener('hidden.bs.modal', function() {
            currentOrderId = null;
            const editForm = document.getElementById('editOrderForm');
            if (editForm) editForm.reset();
            document.getElementById('editCourseInfo').innerHTML = '';
        });
    }
    
    const deleteModal = document.getElementById('deleteConfirmModal');
    if (deleteModal) {
        deleteModal.addEventListener('hidden.bs.modal', function() {
            currentOrderId = null;
        });
    }
    
    const personsInput = document.getElementById('editPersons');
    if (personsInput) {
        personsInput.addEventListener('input', function() {
            const value = parseInt(this.value) || 1;
            this.value = Math.min(20, Math.max(1, value));
        });
    }
}

function showFallbackOrders() {
    const tableBody = document.getElementById('orders-table-body');
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-5">
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>Временные технические неполадки</strong>
                    <p class="mb-0 mt-2">Попробуйте обновить страницу или зайти позже.</p>
                </div>
            </td>
        </tr>
    `;
}

function showNotification(type, message) {
    const notificationArea = document.getElementById('notification-area');
    
    if (!notificationArea) {
        console.log(`Уведомление (${type}): ${message}`);
        return;
    }
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const notificationId = `notification-${Date.now()}`;
    
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `alert ${alertClass} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    notificationArea.appendChild(notification);
    
    setTimeout(() => {
        const element = document.getElementById(notificationId);
        if (element) {
            element.remove();
        }
    }, 5000);
}

window.loadOrders = loadOrders;
window.showOrderDetails = showOrderDetails;
window.editOrder = editOrder;
window.saveOrderChanges = saveOrderChanges;
window.confirmOrderDelete = confirmOrderDelete;
window.confirmDeleteOrder = confirmDeleteOrder;
window.showNotification = showNotification;