class ExamSystem {
    constructor() {
        this.examData = null;
        this.currentSectionIndex = 0;
        this.currentQuestionIndex = 0;
        this.responses = {}; // { questionId: { answer: int|null, status: string } }
        this.timerInterval = null;
        this.remainingTime = 0;

        // Status constants
        this.STATUS = {
            NOT_VISITED: 'not-visited',
            NOT_ANSWERED: 'not-answered',
            ANSWERED: 'answered',
            MARKED: 'marked',
            MARKED_ANSWERED: 'marked-answered'
        };
    }

    async init() {
        try {
            const response = await fetch('data/questions/questions.json');
            this.examData = await response.json();
            this.remainingTime = this.examData.durationSeconds;

            this.initResponses();
            this.renderTabs();
            this.startTimer();
            this.loadQuestion(0, 0); // Load first section, first question
        } catch (error) {
            console.error('Failed to init exam:', error);
            alert('Failed to load exam data.');
        }
    }

    initResponses() {
        this.examData.sections.forEach(section => {
            section.questions.forEach(q => {
                this.responses[q.id] = {
                    status: this.STATUS.NOT_VISITED,
                    answer: null
                };
            });
        });
    }

    startTimer() {
        const timerEl = document.getElementById('timer');
        this.timerInterval = setInterval(() => {
            this.remainingTime--;

            const hours = Math.floor(this.remainingTime / 3600);
            const minutes = Math.floor((this.remainingTime % 3600) / 60);
            const seconds = this.remainingTime % 60;

            this.updateTimerDisplay();

            if (this.remainingTime <= 0) {
                clearInterval(this.timerInterval);
                alert('Time is up! Submitting exam automatically.');
                this.submitExam();
            }
        }, 1000);
        this.updateTimerDisplay(); // Initial call
    }

    updateTimerDisplay() {
        const timerEl = document.getElementById('timer');
        const hours = Math.floor(this.remainingTime / 3600);
        const minutes = Math.floor((this.remainingTime % 3600) / 60);
        const seconds = this.remainingTime % 60;
        timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    renderTabs() {
        const tabsContainer = document.getElementById('section-tabs');
        tabsContainer.innerHTML = '';

        this.examData.sections.forEach((section, index) => {
            const tab = document.createElement('div');
            tab.className = `section-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = section.name;
            tab.onclick = () => this.switchSection(index);
            tabsContainer.appendChild(tab);
        });
    }

    switchSection(index) {
        this.currentSectionIndex = index;
        this.currentQuestionIndex = 0; // Reset to first question of section usually, or find first not answered?
        // Usually goes to first question of that section

        // Update tabs UI
        const tabs = document.querySelectorAll('.section-tab');
        tabs.forEach((t, i) => {
            if (i === index) t.classList.add('active');
            else t.classList.remove('active');
        });

        document.getElementById('current-section-name').textContent = this.examData.sections[index].name;

        this.loadQuestion(this.currentSectionIndex, 0);
    }

    loadQuestion(secIndex, qIndex) {
        // Save state of current question if moving away?
        // Actually save happens on button click only in these systems usually.
        // But we must mark as "Not Answered" (Red) if visited and left without answering.

        // Update current tracking
        this.currentSectionIndex = secIndex;
        this.currentQuestionIndex = qIndex;

        const section = this.examData.sections[secIndex];
        const question = section.questions[qIndex];
        const response = this.responses[question.id];

        // Mark as visited if it was not visited
        if (response.status === this.STATUS.NOT_VISITED) {
            response.status = this.STATUS.NOT_ANSWERED;
        }

        // Render Question
        document.getElementById('q-num').textContent = qIndex + 1;
        document.getElementById('question-text').textContent = question.text;

        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';

        question.options.forEach((opt, idx) => {
            const div = document.createElement('div');
            div.className = 'option-item';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'option';
            radio.value = idx;
            radio.id = `opt_${idx}`;
            if (response.answer === idx) radio.checked = true;

            const label = document.createElement('label');
            label.htmlFor = `opt_${idx}`;
            label.textContent = opt;

            div.appendChild(radio);
            div.appendChild(label);
            optionsContainer.appendChild(div);
        });

        this.renderPalette();
    }

    renderPalette() {
        const grid = document.getElementById('palette-grid');
        grid.innerHTML = '';

        const section = this.examData.sections[this.currentSectionIndex];

        section.questions.forEach((q, idx) => {
            const btn = document.createElement('div');
            btn.className = 'palette-btn';
            btn.textContent = idx + 1;

            const status = this.responses[q.id].status;

            // Map status to class
            if (status === this.STATUS.NOT_VISITED) btn.classList.add('status-not-visited');
            else if (status === this.STATUS.NOT_ANSWERED) btn.classList.add('status-not-answered');
            else if (status === this.STATUS.ANSWERED) btn.classList.add('status-answered');
            else if (status === this.STATUS.MARKED) btn.classList.add('status-marked');
            else if (status === this.STATUS.MARKED_ANSWERED) btn.classList.add('status-marked-answered');

            // Highlight current
            if (idx === this.currentQuestionIndex) {
                btn.style.border = '2px solid black';
            }

            btn.onclick = () => this.loadQuestion(this.currentSectionIndex, idx);
            grid.appendChild(btn);
        });

        this.updateLegendCounts();
    }

    updateLegendCounts() {
        // Count across ALL sections or just current? Usually ALL.
        let counts = {
            [this.STATUS.ANSWERED]: 0,
            [this.STATUS.NOT_ANSWERED]: 0,
            [this.STATUS.NOT_VISITED]: 0,
            [this.STATUS.MARKED]: 0,
            [this.STATUS.MARKED_ANSWERED]: 0
        };

        Object.values(this.responses).forEach(r => {
            counts[r.status]++;
        });

        // Update UI (selectors might need to be more specific if multiple classes match)
        // Simplified mapping based on order in HTML or distinct classes
        const legends = document.querySelectorAll('.palette-legend .legend-item span');
        // 0: Answered, 1: Not Answered, 2: Not Visited, 3: Marked, 4: Marked Answered
        if(legends[0]) legends[0].textContent = counts[this.STATUS.ANSWERED];
        if(legends[1]) legends[1].textContent = counts[this.STATUS.NOT_ANSWERED];
        if(legends[2]) legends[2].textContent = counts[this.STATUS.NOT_VISITED];
        if(legends[3]) legends[3].textContent = counts[this.STATUS.MARKED];
        if(legends[4]) legends[4].textContent = counts[this.STATUS.MARKED_ANSWERED];
    }

    // Actions
    saveAndNext() {
        const currentQId = this.getCurrentQuestionId();
        const selectedOption = document.querySelector('input[name="option"]:checked');

        if (selectedOption) {
            this.responses[currentQId].answer = parseInt(selectedOption.value);
            this.responses[currentQId].status = this.STATUS.ANSWERED;
        } else {
            // If saving without answer, technically it remains 'not-answered' (red)
            // But usually Save & Next implies you want to save. If no answer, just move next.
            if (this.responses[currentQId].status === this.STATUS.NOT_VISITED) {
                 this.responses[currentQId].status = this.STATUS.NOT_ANSWERED;
            }
        }

        this.moveToNextQuestion();
    }

    clearResponse() {
        const currentQId = this.getCurrentQuestionId();
        const radios = document.querySelectorAll('input[name="option"]');
        radios.forEach(r => r.checked = false);

        this.responses[currentQId].answer = null;
        this.responses[currentQId].status = this.STATUS.NOT_ANSWERED;

        this.renderPalette();
    }

    markForReview() {
        const currentQId = this.getCurrentQuestionId();
        const selectedOption = document.querySelector('input[name="option"]:checked');

        if (selectedOption) {
            this.responses[currentQId].answer = parseInt(selectedOption.value);
            this.responses[currentQId].status = this.STATUS.MARKED_ANSWERED;
        } else {
            this.responses[currentQId].status = this.STATUS.MARKED;
        }

        this.moveToNextQuestion();
    }

    moveToNextQuestion() {
        const currentSection = this.examData.sections[this.currentSectionIndex];

        if (this.currentQuestionIndex < currentSection.questions.length - 1) {
            this.loadQuestion(this.currentSectionIndex, this.currentQuestionIndex + 1);
        } else {
            // Check if there is next section
            if (this.currentSectionIndex < this.examData.sections.length - 1) {
                 this.switchSection(this.currentSectionIndex + 1);
            } else {
                alert('You have reached the end of the questions.');
                this.renderPalette(); // Just refresh
            }
        }
    }

    getCurrentQuestionId() {
        return this.examData.sections[this.currentSectionIndex].questions[this.currentQuestionIndex].id;
    }

    submitExam() {
        if (!confirm("Are you sure you want to submit?")) return;

        clearInterval(this.timerInterval);

        const payload = {
            responses: this.responses,
            timestamp: new Date().toISOString()
        };

        fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            alert('Exam submitted successfully!');
            // Disable UI or redirect
            document.body.innerHTML = '<h1 style="text-align:center; margin-top: 50px;">Exam Submitted. Thank You.</h1>';
        })
        .catch(err => {
            alert('Error submitting exam. Please try again.');
            console.error(err);
        });
    }
}

const exam = new ExamSystem();
window.onload = () => exam.init();
