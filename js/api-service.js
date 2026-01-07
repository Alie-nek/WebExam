class ApiService {
    constructor() {
        this.baseUrl = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
        this.apiKey = 'df737163-35b8-4b36-b94b-f06b32e59cf5';
        this.coursesPerPage = 5;
        this.ordersPerPage = 5;
        this.studentId = null;
        this.cache = {
            courses: null,
            tutors: null,
            orders: null
        };
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        
        url.searchParams.append('api_key', this.apiKey);
        
        const options = {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url.toString(), options);
            
            if (!response.ok) {
                let errorMessage = `HTTP ошибка ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    // игнорируем ошибку парсинга JSON
                }
                throw new Error(errorMessage);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Не удалось подключиться к серверу. Проверьте интернет-соединение.');
            }
            
            throw error;
        }
    }

    async getAllCourses() {
        if (this.cache.courses) {
            return this.cache.courses;
        }
        
        try {
            const courses = await this.makeRequest('/api/courses');
            this.cache.courses = courses;
            return courses;
        } catch (error) {
            if (this.cache.courses) {
                return this.cache.courses;
            }
            throw error;
        }
    }

    async getCourseById(courseId) {
        if (this.cache.courses) {
            const cachedCourse = this.cache.courses.find(course => course.id == courseId);
            if (cachedCourse) {
                return cachedCourse;
            }
        }
        
        return this.makeRequest(`/api/courses/${courseId}`);
    }

    async getAllTutors() {
        if (this.cache.tutors) {
            return this.cache.tutors;
        }
        
        try {
            const tutors = await this.makeRequest('/api/tutors');
            this.cache.tutors = tutors;
            return tutors;
        } catch (error) {
            if (this.cache.tutors) {
                return this.cache.tutors;
            }
            throw error;
        }
    }

    async getTutorById(tutorId) {
        if (this.cache.tutors) {
            const cachedTutor = this.cache.tutors.find(tutor => tutor.id == tutorId);
            if (cachedTutor) {
                return cachedTutor;
            }
        }
        
        return this.makeRequest(`/api/tutors/${tutorId}`);
    }

    async getAllOrders() {
        const orders = await this.makeRequest('/api/orders');
        
        if (orders && orders.length > 0 && !this.studentId) {
            this.studentId = orders[0].student_id;
        }
        
        return orders;
    }

    async getOrderById(orderId) {
        return this.makeRequest(`/api/orders/${orderId}`);
    }

    async createOrder(orderData) {
        const requiredFields = ['date_start', 'time_start', 'persons', 'price'];
        const missingFields = requiredFields.filter(field => !orderData[field] && orderData[field] !== 0);
        
        if (missingFields.length > 0) {
            throw new Error(`Отсутствуют обязательные поля: ${missingFields.join(', ')}`);
        }
        
        const formattedData = {
            date_start: orderData.date_start,
            time_start: orderData.time_start,
            persons: parseInt(orderData.persons),
            price: parseInt(orderData.price),
            early_registration: orderData.early_registration || false,
            group_enrollment: orderData.group_enrollment || false,
            intensive_course: orderData.intensive_course || false,
            supplementary: orderData.supplementary || false,
            personalized: orderData.personalized || false,
            excursions: orderData.excursions || false,
            assessment: orderData.assessment || false,
            interactive: orderData.interactive || false
        };
        
        if (!orderData.duration || orderData.duration < 1) {
            throw new Error('Поле duration не может быть пустым и должно быть больше 0');
        }
        formattedData.duration = parseInt(orderData.duration);
        
        if (orderData.course_id) {
            formattedData.course_id = parseInt(orderData.course_id);
        } else if (orderData.tutor_id) {
            formattedData.tutor_id = parseInt(orderData.tutor_id);
        } else {
            throw new Error('Не указан ни курс, ни репетитор');
        }
        
        if (orderData.tutor_id && (formattedData.duration < 1 || formattedData.duration > 40)) {
            throw new Error('Duration для репетитора должен быть от 1 до 40 часов');
        }
        
        const result = await this.makeRequest('/api/orders', 'POST', formattedData);
        
        this.cache.orders = null;
        
        return result;
    }

    async updateOrder(orderId, orderData) {
        return this.makeRequest(`/api/orders/${orderId}`, 'PUT', orderData);
    }

    async deleteOrder(orderId) {
        return this.makeRequest(`/api/orders/${orderId}`, 'DELETE');
    }

    calculateCoursePrice(course, dateStart, timeStart, persons, options = {}) {
        const courseFeePerHour = course.course_fee_per_hour;
        const durationInHours = course.total_length * course.week_length;
        
        const startDate = new Date(dateStart + 'T00:00:00');
        const dayOfWeek = startDate.getDay();
        
        let isWeekendOrHoliday = 1;
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            isWeekendOrHoliday = 1.5;
        }
        
        const holidays = [
            '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', 
            '2025-01-06', '2025-01-07', '2025-01-08', '2025-02-23', '2025-03-08', 
            '2025-05-01', '2025-05-09', '2025-06-12', '2025-11-04', '2026-01-01', 
            '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', 
            '2026-01-07', '2026-01-08', '2026-02-23', '2026-03-08', '2026-05-01', 
            '2026-05-09', '2026-06-12', '2026-11-04'
        ];
        
        const dateStr = startDate.toISOString().split('T')[0];
        if (holidays.includes(dateStr)) {
            isWeekendOrHoliday = 1.5;
        }
        
        const startHour = parseInt(timeStart.split(':')[0]);
        
        let morningSurcharge = 0;
        if (startHour >= 9 && startHour < 12) {
            morningSurcharge = 400;
        }
        
        let eveningSurcharge = 0;
        if (startHour >= 18 && startHour < 20) {
            eveningSurcharge = 1000;
        }
        
        let totalPrice = ((courseFeePerHour * durationInHours * isWeekendOrHoliday) + morningSurcharge + eveningSurcharge) * persons;
        
        if (options.early_registration) {
            totalPrice *= 0.9;
        }
        
        if (options.group_enrollment && persons >= 5) {
            totalPrice *= 0.85;
        }
        
        if (options.intensive_course && course.week_length >= 5) {
            totalPrice *= 1.2;
        }
        
        if (options.supplementary) {
            totalPrice += 2000 * persons;
        }
        
        if (options.personalized) {
            totalPrice += 1500 * course.total_length;
        }
        
        if (options.assessment) {
            totalPrice += 300;
        }
        
        if (options.excursions) {
            totalPrice *= 1.25;
        }
        
        if (options.interactive) {
            totalPrice *= 1.5;
        }
        
        return Math.round(totalPrice);
    }

    calculateTutorPrice(tutor, durationHours, dateStart, timeStart, persons, options = {}) {
        const hourRate = tutor.price_per_hour || 1000;
        
        const startDate = new Date(dateStart + 'T00:00:00');
        const dayOfWeek = startDate.getDay();
        
        let isWeekendOrHoliday = 1;
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            isWeekendOrHoliday = 1.5;
        }
        
        const holidays = [
            '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', 
            '2025-01-06', '2025-01-07', '2025-01-08', '2025-02-23', '2025-03-08', 
            '2025-05-01', '2025-05-09', '2025-06-12', '2025-11-04', '2026-01-01', 
            '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', 
            '2026-01-07', '2026-01-08', '2026-02-23', '2026-03-08', '2026-05-01', 
            '2026-05-09', '2026-06-12', '2026-11-04'
        ];
        
        const dateStr = startDate.toISOString().split('T')[0];
        if (holidays.includes(dateStr)) {
            isWeekendOrHoliday = 1.5;
        }
        
        const startHour = parseInt(timeStart.split(':')[0]);
        
        let morningSurcharge = 0;
        if (startHour >= 9 && startHour < 12) {
            morningSurcharge = 400;
        }
        
        let eveningSurcharge = 0;
        if (startHour >= 18 && startHour < 20) {
            eveningSurcharge = 1000;
        }
        
        let basePrice = (hourRate * durationHours * isWeekendOrHoliday);
        basePrice += morningSurcharge + eveningSurcharge;
        
        let totalPrice = basePrice * persons;
        
        if (options.early_registration) {
            totalPrice *= 0.9;
        }
        
        if (options.group_enrollment && persons >= 5) {
            totalPrice *= 0.85;
        }
        
        if (options.intensive_course && durationHours >= 10) {
            totalPrice *= 1.2;
        }
        
        if (options.supplementary) {
            totalPrice += 2000 * persons;
        }
        
        if (options.personalized) {
            totalPrice += 1500 * Math.ceil(durationHours / 10);
        }
        
        if (options.assessment) {
            totalPrice += 300;
        }
        
        if (options.excursions) {
            totalPrice *= 1.25;
        }
        
        if (options.interactive) {
            totalPrice *= 1.5;
        }
        
        return Math.round(totalPrice);
    }

    getAvailableTimesForCourse() {
        const times = [];
        for (let hour = 9; hour <= 20; hour++) {
            times.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return times;
    }

    calculateEndDate(startDate, totalWeeks) {
        try {
            if (!startDate || !totalWeeks) {
                return '';
            }
            
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                return '';
            }
            
            const end = new Date(start);
            end.setDate(start.getDate() + (totalWeeks * 7));
            
            if (isNaN(end.getTime())) {
                return '';
            }
            
            return end.toISOString().split('T')[0];
        } catch {
            return '';
        }
    }

    clearCache() {
        this.cache = {
            courses: null,
            tutors: null,
            orders: null
        };
    }
}

window.apiService = new ApiService();