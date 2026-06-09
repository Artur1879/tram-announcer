class TramInformator {
    constructor() {
        this.isPowered = false;
        this.routes = [];
        this.currentRoute = null;
        this.currentDirection = null;
        this.currentStopIndex = 0;
        this.isPlaying = false;
        this.isAutoMode = false;
        this.isRepeatMode = false;
        this.audio = document.getElementById('audioPlayer');
        this.autoPlayTimer = null;
        
        this.init();
    }
    
    async init() {
        await this.loadRoutes();
        this.setupEventListeners();
        this.startClock();
        this.showStatus('Готов к работе');
    }
    
    async loadRoutes() {
        try {
            const response = await fetch('routes.json');
            this.routes = await response.json();
            this.populateRouteSelect();
        } catch (error) {
            console.log('Используются тестовые маршруты');
            this.routes = this.getTestRoutes();
            this.populateRouteSelect();
        }
    }
    
    getTestRoutes() {
        return [
            {
                routeNumber: "А",
                name: "Маршрут А",
                directions: [
                    {
                        id: "A_forward",
                        name: "Центральный рынок → Вокзал",
                        arrow: "→",
                        stops: [
                            "Центральный рынок",
                            "Площадь Ленина",
                            "Улица Мира",
                            "Парк Культуры",
                            "Ж/Д Вокзал"
                        ]
                    },
                    {
                        id: "A_backward",
                        name: "Вокзал → Центральный рынок",
                        arrow: "←",
                        stops: [
                            "Ж/Д Вокзал",
                            "Парк Культуры",
                            "Улица Мира",
                            "Площадь Ленина",
                            "Центральный рынок"
                        ]
                    }
                ]
            },
            {
                routeNumber: "Б",
                name: "Маршрут Б",
                directions: [
                    {
                        id: "B_forward",
                        name: "Парк Победы → Заводская",
                        arrow: "→",
                        stops: [
                            "Парк Победы",
                            "Школа №5",
                            "Городская больница",
                            "Заводская улица"
                        ]
                    }
                ]
            }
        ];
    }
    
    populateRouteSelect() {
        const routeSelect = document.getElementById('routeSelect');
        routeSelect.innerHTML = '<option value="">Выберите маршрут</option>';
        
        this.routes.forEach(route => {
            const option = document.createElement('option');
            option.value = route.routeNumber;
            option.textContent = `Маршрут ${route.routeNumber}`;
            routeSelect.appendChild(option);
        });
    }
    
    setupEventListeners() {
        // Питание
        document.getElementById('powerButton').addEventListener('click', () => this.togglePower());
        
        // Выбор маршрута
        document.getElementById('routeSelect').addEventListener('change', (e) => this.onRouteSelect(e.target.value));
        document.getElementById('directionSelect').addEventListener('change', (e) => this.onDirectionSelect(e.target.value));
        
        // Управление воспроизведением
        document.getElementById('playButton').addEventListener('click', () => this.playAnnouncement());
        document.getElementById('stopButton').addEventListener('click', () => this.stopAnnouncement());
        document.getElementById('prevButton').addEventListener('click', () => this.prevStop());
        document.getElementById('nextButton').addEventListener('click', () => this.nextStop());
        
        // Режимы
        document.getElementById('autoButton').addEventListener('click', () => this.toggleAutoMode());
        document.getElementById('repeatButton').addEventListener('click', () => this.toggleRepeatMode());
        
        // Громкость
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.audio.volume = e.target.value / 100;
        });
        
        // Аудио события
        this.audio.addEventListener('ended', () => this.onAudioEnded());
        this.audio.addEventListener('error', () => this.showStatus('Ошибка аудио'));
    }
    
    togglePower() {
        this.isPowered = !this.isPowered;
        const powerBtn = document.getElementById('powerButton');
        const display = document.getElementById('tramDisplay');
        const controlPanel = document.getElementById('controlPanel');
        
        if (this.isPowered) {
            powerBtn.className = 'power-button power-on';
            display.className = 'tram-display active';
            controlPanel.className = 'control-panel';
            this.showStatus('Система включена');
            this.enableControls();
        } else {
            powerBtn.className = 'power-button power-off';
            display.className = 'tram-display disabled';
            controlPanel.className = 'control-panel disabled';
            this.stopAnnouncement();
            this.resetDisplay();
            this.showStatus('Система выключена');
        }
    }
    
    onRouteSelect(routeNumber) {
        const directionSelect = document.getElementById('directionSelect');
        directionSelect.innerHTML = '<option value="">Выберите направление</option>';
        directionSelect.disabled = true;
        
        if (!routeNumber) {
            this.resetDisplay();
            return;
        }
        
        const route = this.routes.find(r => r.routeNumber === routeNumber);
        if (!route) return;
        
        directionSelect.disabled = false;
        route.directions.forEach(dir => {
            const option = document.createElement('option');
            option.value = dir.id;
            option.textContent = dir.name;
            directionSelect.appendChild(option);
        });
        
        this.showStatus(`Выбран маршрут ${routeNumber}`);
    }
    
    onDirectionSelect(directionId) {
        if (!directionId) {
            this.resetDisplay();
            return;
        }
        
        // Находим маршрут и направление
        const selectedRoute = document.getElementById('routeSelect').value;
        const route = this.routes.find(r => r.routeNumber === selectedRoute);
        if (!route) return;
        
        this.currentDirection = route.directions.find(d => d.id === directionId);
        if (!this.currentDirection) return;
        
        this.currentStopIndex = 0;
        this.updateDisplay();
        this.enablePlayControls();
        
        this.showStatus(`Направление: ${this.currentDirection.name}`);
    }
    
    updateDisplay() {
        if (!this.currentDirection) return;
        
        // Номер маршрута и стрелка направления
        document.getElementById('routeNumber').textContent = 
            document.getElementById('routeSelect').value;
        document.getElementById('directionArrow').textContent = 
            this.currentDirection.arrow;
        document.getElementById('directionName').textContent = 
            this.currentDirection.name;
        
        // Текущая остановка
        const currentStop = this.currentDirection.stops[this.currentStopIndex];
        document.getElementById('currentStopName').textContent = currentStop;
        
        // Следующая остановка
        const nextIndex = this.currentStopIndex + 1;
        if (nextIndex < this.currentDirection.stops.length) {
            document.getElementById('nextStopName').textContent = 
                this.currentDirection.stops[nextIndex];
        } else {
            document.getElementById('nextStopName').textContent = 'Конечная';
        }
        
        // Прогресс
        const progress = ((this.currentStopIndex + 1) / this.currentDirection.stops.length) * 100;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('stopCounter').textContent = 
            `${this.currentStopIndex + 1}/${this.currentDirection.stops.length}`;
    }
    
    resetDisplay() {
        document.getElementById('routeNumber').textContent = '--';
        document.getElementById('directionArrow').textContent = '→';
        document.getElementById('directionName').textContent = 'Выберите маршрут';
        document.getElementById('currentStopName').textContent = '---';
        document.getElementById('nextStopName').textContent = '---';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('stopCounter').textContent = '0/0';
        
        this.currentDirection = null;
        this.currentStopIndex = 0;
        this.disablePlayControls();
    }
    
    playAnnouncement() {
        if (!this.currentDirection) return;
        
        const stopName = this.currentDirection.stops[this.currentStopIndex];
        
        // Генерируем текст для озвучки (заглушка)
        const announcement = `Остановка ${stopName}`;
        
        // Если есть аудиофайл - используем его
        const audioFile = `audio/${this.currentDirection.id}_stop${this.currentStopIndex + 1}.mp3`;
        
        this.audio.src = audioFile;
        this.audio.play().catch(() => {
            // Если файл не найден, используем синтез речи
            this.speakText(announcement);
        });
        
        this.isPlaying = true;
        this.updatePlayButton();
        this.showStatus(`▶ ${announcement}`);
    }
    
    speakText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ru-RU';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.onend = () => this.onAudioEnded();
            window.speechSynthesis.speak(utterance);
        }
    }
    
    stopAnnouncement() {
        this.audio.pause();
        this.audio.currentTime = 0;
        window.speechSynthesis.cancel();
        
        this.isPlaying = false;
        this.stopAutoTimer();
        this.updatePlayButton();
        this.showStatus('⏹ Воспроизведение остановлено');
    }
    
    prevStop() {
        if (!this.currentDirection) return;
        
        if (this.currentStopIndex > 0) {
            this.stopAnnouncement();
            this.currentStopIndex--;
            this.updateDisplay();
            this.showStatus(`◀◀ ${this.currentDirection.stops[this.currentStopIndex]}`);
        }
    }
    
    nextStop() {
        if (!this.currentDirection) return;
        
        if (this.currentStopIndex < this.currentDirection.stops.length - 1) {
            this.stopAnnouncement();
            this.currentStopIndex++;
            this.updateDisplay();
            
            if (this.isAutoMode) {
                this.playAnnouncement();
            } else {
                this.showStatus(`▶▶ ${this.currentDirection.stops[this.currentStopIndex]}`);
            }
        } else if (this.isRepeatMode) {
            this.stopAnnouncement();
            this.currentStopIndex = 0;
            this.updateDisplay();
            
            if (this.isAutoMode) {
                this.playAnnouncement();
            }
        }
    }
    
    onAudioEnded() {
        this.isPlaying = false;
        this.updatePlayButton();
        
        if (this.isAutoMode) {
            this.autoPlayTimer = setTimeout(() => {
                this.nextStop();
            }, 2000); // 2 секунды паузы между остановками
        }
    }
    
    toggleAutoMode() {
        this.isAutoMode = !this.isAutoMode;
        const autoBtn = document.getElementById('autoButton');
        
        if (this.isAutoMode) {
            autoBtn.classList.add('active');
            this.showStatus('🔄 Авторежим ВКЛ');
            if (!this.isPlaying) {
                this.playAnnouncement();
            }
        } else {
            autoBtn.classList.remove('active');
            this.stopAutoTimer();
            this.showStatus('🔄 Авторежим ВЫКЛ');
        }
    }
    
    toggleRepeatMode() {
        this.isRepeatMode = !this.isRepeatMode;
        const repeatBtn = document.getElementById('repeatButton');
        
        if (this.isRepeatMode) {
            repeatBtn.classList.add('active');
            this.showStatus('🔁 Повтор ВКЛ');
        } else {
            repeatBtn.classList.remove('active');
            this.showStatus('🔁 Повтор ВЫКЛ');
        }
    }
    
    stopAutoTimer() {
        if (this.autoPlayTimer) {
            clearTimeout(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }
    
    updatePlayButton() {
        const playIcon = document.getElementById('playIcon');
        playIcon.textContent = this.isPlaying ? '⏸' : '▶';
    }
    
    enableControls() {
        document.getElementById('routeSelect').disabled = false;
        document.getElementById('directionSelect').disabled = false;
    }
    
    enablePlayControls() {
        if (!this.isPowered) return;
        
        document.getElementById('playButton').disabled = false;
        document.getElementById('stopButton').disabled = false;
        document.getElementById('prevButton').disabled = false;
        document.getElementById('nextButton').disabled = false;
        document.getElementById('autoButton').disabled = false;
        document.getElementById('repeatButton').disabled = false;
    }
    
    disablePlayControls() {
        document.getElementById('playButton').disabled = true;
        document.getElementById('stopButton').disabled = true;
        document.getElementById('prevButton').disabled = true;
        document.getElementById('nextButton').disabled = true;
        document.getElementById('autoButton').disabled = true;
        document.getElementById('repeatButton').disabled = true;
    }
    
    startClock() {
        const updateClock = () => {
            const now = new Date();
            
            // Дата
            const dateStr = now.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            document.getElementById('currentDate').textContent = dateStr;
            
            // Время
            const timeStr = now.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('currentTime').textContent = timeStr;
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    showStatus(message) {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.classList.add('show');
        
        setTimeout(() => {
            statusEl.classList.remove('show');
        }, 2000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new TramInformator();
});
