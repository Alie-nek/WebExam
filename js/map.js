/* global ymaps */
let yandexMap;
let mapPlacemarks = [];
const resourceSearchQueries = {
    educational: [
        'языковая школа',
        'курсы иностранных языков'
    ],
    community: [
        'культурный центр',
        'общественный центр изучения языков'
    ],
    library: [
        'библиотека иностранной литературы'
    ],
    private: [
        'частные курсы английского языка'
    ],
    cafe: [
        'языковой клуб',
        'разговорный клуб'
    ]
};

if (typeof ymaps !== 'undefined') {
    ymaps.ready(initYandexMap);
} else {
    console.error('Yandex Maps API не загружена');
    showNotification('error', 'Не удалось загрузить Яндекс.Карты');
}

function initYandexMap() {
    if (typeof ymaps === 'undefined') {
        console.error('ymaps не определен');
        showNotification('error', 'Ошибка инициализации карты');
        return;
    }
    
    yandexMap = new ymaps.Map('yandex-map', {
        center: [55.751244, 37.618423], // Москва
        zoom: 12,
        controls: ['zoomControl', 'fullscreenControl']
    });
    
    loadInitialResources();
    
    setupMapEventListeners();
}

function setupMapEventListeners() {
    const searchBtn = document.querySelector('button[onclick="searchResources()"]');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchResources);
    }
    
    const searchInput = document.getElementById('map-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchResources();
            }
        });
    }
    
    const resourceTypeSelect = document.getElementById('resource-type');
    if (resourceTypeSelect) {
        resourceTypeSelect.addEventListener('change', filterResources);
    }
}

async function loadInitialResources() {
    try {
        showLoading('Загружаем учебные ресурсы...');
        
        clearPlacemarks();
        
        for (const [type, queries] of Object.entries(resourceSearchQueries)) {
            for (const query of queries) {
                await searchAndAddPlaces(`${query} Москва`, type);
                await delay(500);
            }
        }
        
        hideLoading();
        showNotification('success', 'Загрузка ресурсов завершена');
        
    } catch (error) {
        console.error('Ошибка загрузки ресурсов:', error);
        showNotification('error', 'Ошибка загрузки ресурсов');
    }
}

async function searchAndAddPlaces(query, type) {
    return new Promise((resolve) => {
        console.log(`Ищем: ${query}`);
        
        if (typeof ymaps === 'undefined') {
            console.warn('ymaps не доступна для поиска');
            resolve();
            return;
        }
        
        const tempSearch = new ymaps.control.SearchControl({
            options: {
                provider: 'yandex#search',
                noPlacemark: true,
                resultsPerPage: 10
            }
        });
        
        tempSearch.events.add('load', function(e) {
            const results = e.get('target').getResultsArray();
            
            console.log(`Найдено ${results.length} результатов для "${query}":`);
            
            results.forEach((result, index) => {
                if (result.geometry && result.properties) {
                    const properties = result.properties;
                    const name = properties.get('name') || 'Неизвестное место';
                    const text = properties.get('text') || '';
                    const description = properties.get('description') || '';
                    
                    console.log(`Результат ${index + 1}:`, {
                        name: name,
                        text: text,
                        description: description
                    });
                    
                    let address = extractAddressFromYandexData(name, text, description);
                    
                    let realDescription = description;
                    if (realDescription && realDescription.includes(',') && realDescription.length < 100) {
                        realDescription = createDescriptionByType(type);
                    }
                    
                    addPlacemarkFromData(
                        result.geometry.getCoordinates(),
                        name,
                        type,
                        address,
                        realDescription || createDescriptionByType(type)
                    );
                }
            });
            
            resolve();
        });
        
        tempSearch.events.add('error', function() {
            console.warn(`Ошибка поиска: ${query}`);
            resolve();
        });
        
        tempSearch.search(query);
    });
}

function extractAddressFromYandexData(name, text, description) {
    console.log('Извлекаем адрес из:', { name, text, description });
    
    if (text && text.trim()) {
        let address = text;
        if (name && text.includes(name)) {
            address = text.replace(name, '').trim();
            address = address.replace(/^[,\s]+/, '');
        }
        
        if (address && address.trim()) {
            console.log('Адрес из text:', address);
            return address;
        }
    }
    
    if (description && description.includes(',') && description.length < 100) {
        console.log('Адрес из description:', description);
        return description;
    }
    
    console.log('Адрес не найден, используем "Адрес не указан"');
    return 'Адрес не указан';
}

function createDescriptionByType(type) {
    const descriptions = {
        educational: 'Языковая школа или курсы иностранных языков. Предлагает занятия с профессиональными преподавателями, подготовку к экзаменам и сертификацию.',
        community: 'Культурный или общественный центр для изучения языков. Проводит языковые встречи, разговорные клубы и культурные мероприятия.',
        library: 'Библиотека с литературой на иностранных языках. Предоставляет доступ к учебным материалам, книгам и аудиовизуальным ресурсам.',
        private: 'Частные языковые курсы или репетитор. Индивидуальные занятия, подготовка к экзаменам, специализированные программы.',
        cafe: 'Кафе или клуб для языковой практики. Неформальная обстановка для разговорной практики с носителями языка.'
    };
    
    return descriptions[type] || 'Место для изучения иностранных языков. Предоставляет услуги по изучению иностранных языков и культурному обмену.';
}

function addPlacemarkFromData(coordinates, name, type, address, description) {
    if (typeof ymaps === 'undefined' || !yandexMap) {
        console.error('ymaps или yandexMap не определены');
        return null;
    }
    
    const exists = mapPlacemarks.some(pm => 
        Math.abs(pm.coordinates[0] - coordinates[0]) < 0.0001 && 
        Math.abs(pm.coordinates[1] - coordinates[1]) < 0.0001
    );
    
    if (exists) {
        console.log('Метка уже существует:', name);
        return null;
    }
    
    console.log('Добавляем метку:', { name, type, address });
    
    const typeConfig = getTypeConfig(type);
    
    const placemark = new ymaps.Placemark(
        coordinates,
        {
            balloonContentHeader: `<strong>${name}</strong>`,
            balloonContentBody: createBalloonContent(name, type, address, description),
            hintContent: name
        },
        {
            preset: typeConfig.preset,
            iconColor: typeConfig.color
        }
    );
    
    placemark.events.add('click', function() {
        showResourceDetails(name, type, address, description);
    });
    
    yandexMap.geoObjects.add(placemark);
    
    mapPlacemarks.push({
        object: placemark,
        coordinates: coordinates,
        type: type,
        name: name,
        address: address,
        description: description
    });
    
    return placemark;
}

function getTypeConfig(type) {
    const configs = {
        educational: { preset: 'islands#blueEducationIcon', color: '#007bff' },
        community: { preset: 'islands#blueCommunityIcon', color: '#17a2b8' },
        library: { preset: 'islands#greenLibraryIcon', color: '#28a745' },
        private: { preset: 'islands#darkOrangeBusinessIcon', color: '#fd7e14' },
        cafe: { preset: 'islands#darkOrangeCafeIcon', color: '#6f42c1' }
    };
    
    return configs[type] || { preset: 'islands#blueIcon', color: '#28a745' };
}

function getTypeName(type) {
    const typeNames = {
        educational: 'Образовательное учреждение',
        community: 'Общественный центр',
        library: 'Публичная библиотека',
        private: 'Частные языковые курсы',
        cafe: 'Языковой кафе/клуб'
    };
    return typeNames[type] || 'Ресурс';
}

function createBalloonContent(name, type, address, description) {
    return `
        <div style="max-width: 300px; font-size: 14px;">
            <div class="mb-2">
                <strong>Тип:</strong> ${getTypeName(type)}
            </div>
            <div class="mb-2">
                <strong>Название:</strong><br>
                ${name}
            </div>
            <div class="mb-2">
                <strong>Адрес:</strong><br>
                ${address}
            </div>
            <div class="mb-2">
                <strong>Описание:</strong><br>
                ${description}
            </div>
            <div class="mb-2">
                <strong>Предлагаемые услуги:</strong><br>
                ${getServiceDescription(type)}
            </div>
        </div>
    `;
}

function getServiceDescription(type) {
    const services = {
        educational: 'Занятия с преподавателями, учебные материалы, сертификация',
        community: 'Культурные мероприятия, языковые встречи, разговорные клубы',
        library: 'Учебные материалы на иностранных языках, книги, аудиовизуальные ресурсы',
        private: 'Индивидуальные занятия, подготовка к экзаменам, специализированные курсы',
        cafe: 'Разговорная практика в неформальной обстановке, языковые встречи'
    };
    
    return services[type] || 'Изучение иностранных языков';
}

function showResourceDetails(name, type, address, description) {
    const detailsContainer = document.getElementById('resource-details');
    
    if (!detailsContainer) return;
    
    console.log('Показываем детали:', { name, address, description });
    
    detailsContainer.innerHTML = `
        <div class="card border-success">
            <div class="card-header bg-success text-white">
                <h5 class="mb-0">${name}</h5>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <strong>Тип:</strong> ${getTypeName(type)}
                </div>
                
                <div class="mb-3">
                    <strong>Адрес:</strong><br>
                    <div class="alert alert-light py-2 mb-0">
                        <i class="bi bi-geo-alt me-2"></i>
                        ${address}
                    </div>
                </div>
                
                <div class="mb-3">
                    <strong>Часы работы:</strong><br>
                    <div class="alert alert-info py-2 mb-0">
                        <i class="bi bi-clock me-2"></i>
                        Обычно: Пн-Пт 9:00-18:00, Сб 10:00-16:00
                        <small class="d-block text-muted mt-1">Уточняйте на месте</small>
                    </div>
                </div>
                
                <div class="mb-3">
                    <strong>Контактная информация:</strong><br>
                    <div class="alert alert-light py-2 mb-0">
                        <i class="bi bi-telephone me-2"></i>
                        Телефон: +7 (XXX) XXX-XX-XX
                        <br>
                        <i class="bi bi-envelope me-2"></i>
                        Email: info@example.com
                        <small class="d-block text-muted mt-1">Контактные данные могут отличаться</small>
                    </div>
                </div>
                
                <div class="mb-3">
                    <strong>Описание:</strong><br>
                    <div class="alert alert-light py-2 mb-0">
                        ${description}
                    </div>
                </div>
                
                <div class="mb-3">
                    <strong>Краткое описание предлагаемых услуг:</strong><br>
                    <div class="alert alert-light py-2 mb-0">
                        ${getServiceDescription(type)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function searchResources() {
    const searchInput = document.getElementById('map-search');
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('warning', 'Введите поисковый запрос');
        return;
    }
    
    showLoading(`Ищем: ${query}`);
    
    if (typeof ymaps === 'undefined') {
        hideLoading();
        showNotification('error', 'Карта не загружена');
        return;
    }
    
    const tempSearch = new ymaps.control.SearchControl({
        options: {
            provider: 'yandex#search',
            noPlacemark: true,
            resultsPerPage: 20
        }
    });
    
    tempSearch.search(query);
    
    tempSearch.events.add('load', function(e) {
        const results = e.get('target').getResultsArray();
        
        results.forEach(result => {
            if (result.geometry && result.properties) {
                const name = result.properties.get('name') || '';
                const text = result.properties.get('text') || '';
                const description = result.properties.get('description') || '';
                
                const type = determineTypeFromName(name, query);
                
                const address = extractAddressFromYandexData(name, text, description);
                
                let realDescription = description;
                if (realDescription && realDescription.includes(',') && realDescription.length < 100) {
                    realDescription = createDescriptionByType(type);
                }
                
                addPlacemarkFromData(
                    result.geometry.getCoordinates(),
                    name,
                    type,
                    address,
                    realDescription || createDescriptionByType(type)
                );
            }
        });
        
        hideLoading();
        showNotification('success', `Найдено результатов: ${results.length}`);
    });
    
    tempSearch.events.add('error', function() {
        hideLoading();
        showNotification('error', 'Ошибка поиска. Попробуйте другой запрос');
    });
}

function determineTypeFromName(name, query) {
    const nameLower = name.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (nameLower.includes('библиотека') || queryLower.includes('библиотека')) return 'library';
    if (nameLower.includes('культур') || nameLower.includes('обществен') || queryLower.includes('культур')) return 'community';
    if (nameLower.includes('кафе') || nameLower.includes('клуб') || queryLower.includes('кафе') || queryLower.includes('клуб')) return 'cafe';
    if (nameLower.includes('частн') || queryLower.includes('частн')) return 'private';
    return 'educational';
}

function filterResources() {
    const selectedType = document.getElementById('resource-type').value;
    
    if (!yandexMap) return;
    
    mapPlacemarks.forEach(placemark => {
        if (selectedType === 'all' || placemark.type === selectedType) {
            placemark.object.options.set('visible', true);
        } else {
            placemark.object.options.set('visible', false);
        }
    });
    
    const visiblePlacemarks = mapPlacemarks.filter(pm => 
        selectedType === 'all' || pm.type === selectedType
    );
    
    if (visiblePlacemarks.length > 0) {
        const coordinates = visiblePlacemarks.map(pm => pm.coordinates);
        
        if (ymaps.util && ymaps.util.bounds) {
            yandexMap.setBounds(ymaps.util.bounds.fromPoints(coordinates), {
                checkZoomRange: true,
                zoomMargin: 30
            });
        }
    }
}

function clearPlacemarks() {
    if (!yandexMap) return;
    
    mapPlacemarks.forEach(placemark => {
        yandexMap.geoObjects.remove(placemark.object);
    });
    mapPlacemarks = [];
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showLoading(message) {
    const detailsContainer = document.getElementById('resource-details');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="mt-3 text-muted">${message}</p>
            </div>
        `;
    }
}

function hideLoading() {
    const detailsContainer = document.getElementById('resource-details');
    if (detailsContainer && detailsContainer.innerHTML.includes('spinner-border')) {
        detailsContainer.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-map fs-1 d-block mb-3"></i>
                <p>Выберите метку на карте для просмотра подробной информации</p>
            </div>
        `;
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

window.searchResources = searchResources;
window.filterResources = filterResources;