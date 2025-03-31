document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const publishBtn = document.getElementById('publish-btn');
    const generateIdBtn = document.getElementById('generate-id-btn');
    const quizIdInput = document.getElementById('quiz-id');

    // Templates
    const questionTemplate = document.getElementById('question-template');
    const optionTemplate = document.getElementById('option-template');
    const addOptionBtnTemplate = document.getElementById('add-option-btn-template');

    // State
    let questionCount = 0;
    let currentQuizId = generateQuizId();
    quizIdInput.value = currentQuizId;

    // Initialize
    addQuestion(); // Add first question by default

    // Event Listeners
    addQuestionBtn.addEventListener('click', addQuestion);
    publishBtn.addEventListener('click', publishQuiz);
    generateIdBtn.addEventListener('click', generateNewQuizId);

    // Generate a new unique quiz ID
    function generateNewQuizId() {
        currentQuizId = generateQuizId();
        quizIdInput.value = currentQuizId;

        // Add animation
        quizIdInput.classList.add('animate__animated', 'animate__flipInX');
        setTimeout(() => {
            quizIdInput.classList.remove('animate__animated', 'animate__flipInX');
        }, 1000);
    }

    // Generate a random quiz ID
    function generateQuizId() {
        return 'quiz-' + Math.random().toString(36).substr(2, 8);
    }

    // Generate a random question ID
    function generateQuestionId() {
        return 'q-' + Math.random().toString(36).substr(2, 6);
    }

    // Add a new question
    function addQuestion() {
        questionCount++;
        const questionClone = questionTemplate.content.cloneNode(true);
        const questionElement = questionClone.querySelector('.question-card');

        // Set question ID
        const questionId = generateQuestionId();
        questionElement.querySelector('.question-id').value = questionId;

        // Update question number
        questionElement.querySelector('.question-number').textContent = questionCount;

        // Add delete question functionality
        questionElement.querySelector('.delete-question').addEventListener('click', function () {
            questionElement.classList.add('animate__animated', 'animate__fadeOut');
            setTimeout(() => {
                questionElement.remove();
                updateQuestionNumbers();
                questionCount--;
            }, 500);
        });

        // Add answer type change listener
        const answerTypeSelect = questionElement.querySelector('.answer-type');
        answerTypeSelect.addEventListener('change', function () {
            updateAnswerOptions(questionElement, this.value);
        });

        // Initialize answer options
        updateAnswerOptions(questionElement, answerTypeSelect.value);

        // Add animation
        questionElement.classList.add('animate__animated', 'animate__fadeIn');
        setTimeout(() => {
            questionElement.classList.remove('animate__animated', 'animate__fadeIn');
        }, 1000);

        questionsContainer.appendChild(questionClone);
    }

    // Update answer options based on selected type
    function updateAnswerOptions(questionElement, answerType) {
        const optionsContainer = questionElement.querySelector('.answer-options-container');
        optionsContainer.innerHTML = '';

        // Show/hide time limit based on question type
        const timeLimitContainer = questionElement.querySelector('.question-time-limit');
        if (answerType === 'single' || answerType === 'multiple') {
            timeLimitContainer.classList.remove('hidden');
        } else {
            timeLimitContainer.classList.add('hidden');
        }

        switch (answerType) {
            case 'text':
                optionsContainer.innerHTML = '<p class="text-gray-500 italic">Respondents will enter text answers</p>';
                break;

            case 'number':
                optionsContainer.innerHTML = '<p class="text-gray-500 italic">Respondents will enter numeric answers</p>';
                break;

            case 'boolean':
                optionsContainer.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <label class="cursor-pointer label">
                            <input type="radio" name="boolean-${questionCount}" class="radio radio-primary" value="true" checked>
                            <span class="label-text ml-2">True</span>
                        </label>
                        <label class="cursor-pointer label">
                            <input type="radio" name="boolean-${questionCount}" class="radio radio-primary" value="false">
                            <span class="label-text ml-2">False</span>
                        </label>
                    </div>
                `;
                break;

            case 'single':
            case 'multiple':
                // Add initial option
                addOption(optionsContainer, answerType);

                // Add "Add Option" button
                const addOptionBtnClone = addOptionBtnTemplate.content.cloneNode(true);
                const addOptionBtn = addOptionBtnClone.querySelector('.add-option-btn');
                addOptionBtn.addEventListener('click', function () {
                    addOption(optionsContainer, answerType);
                });
                optionsContainer.appendChild(addOptionBtnClone);
                break;
        }
    }

    // Add a new option to a question
    function addOption(optionsContainer, answerType) {
        const optionClone = optionTemplate.content.cloneNode(true);
        const optionElement = optionClone.querySelector('.option-item');

        // Show correct option checkbox/radio based on answer type
        const correctOptionInput = optionElement.querySelector('.correct-option');
        if (answerType === 'multiple') {
            correctOptionInput.style.display = 'block';
            correctOptionInput.classList.add('checkbox-primary');
        } else if (answerType === 'single') {
            correctOptionInput.style.display = 'block';
            correctOptionInput.type = 'radio';
            correctOptionInput.name = `correct-option-${optionsContainer.closest('.question-card').querySelector('.question-id').value}`;
            correctOptionInput.classList.add('radio-primary');
        }

        // Add delete option functionality
        optionElement.querySelector('.delete-option').addEventListener('click', function () {
            optionElement.classList.add('animate__animated', 'animate__fadeOut');
            setTimeout(() => {
                optionElement.remove();
            }, 500);
        });

        // Insert before the "Add Option" button if it exists
        const addOptionBtn = optionsContainer.querySelector('.add-option-btn');
        if (addOptionBtn) {
            optionsContainer.insertBefore(optionClone, addOptionBtn);
        } else {
            optionsContainer.appendChild(optionClone);
        }

        // Add animation
        optionElement.classList.add('animate__animated', 'animate__fadeIn');
        setTimeout(() => {
            optionElement.classList.remove('animate__animated', 'animate__fadeIn');
        }, 1000);
    }

    // Update question numbers after deletion
    function updateQuestionNumbers() {
        const questions = questionsContainer.querySelectorAll('.question-card');
        questions.forEach((question, index) => {
            question.querySelector('.question-number').textContent = index + 1;
        });
    }

    // Publish quiz
    function publishQuiz() {
        const quizTitle = document.getElementById('quiz-title').value;
        const quizDescription = document.getElementById('quiz-description').value;
        const quizId = currentQuizId;

        if (!quizTitle) {
            showAlert('Please enter a quiz title', 'error');
            return;
        }

        const questions = [];
        const questionElements = questionsContainer.querySelectorAll('.question-card');

        questionElements.forEach(questionElement => {
            const questionId = questionElement.querySelector('.question-id').value;
            const questionText = questionElement.querySelector('.question-text').value;
            const marks = parseInt(questionElement.querySelector('.question-marks').value) || 1;
            const answerType = questionElement.querySelector('.answer-type').value;
            const timeLimit = questionElement.querySelector('.time-limit') ?
                parseInt(questionElement.querySelector('.time-limit').value) || 0 : 0;
            const options = [];

            if (!questionText) {
                showAlert('Please enter text for all questions', 'error');
                return;
            }

            if (answerType === 'single' || answerType === 'multiple') {
                const optionElements = questionElement.querySelectorAll('.option-item');
                let hasCorrectOption = false;

                optionElements.forEach(optionElement => {
                    const optionText = optionElement.querySelector('.option-text').value;
                    const isCorrect = optionElement.querySelector('.correct-option').checked;

                    if (optionText) {
                        options.push({
                            text: optionText,
                            correct: isCorrect
                        });

                        if (isCorrect) hasCorrectOption = true;
                    }
                });

                if (options.length < 2) {
                    showAlert('Multiple choice questions must have at least 2 options', 'error');
                    return;
                }

                if (!hasCorrectOption && answerType === 'single') {
                    showAlert('Single choice questions must have one correct option', 'error');
                    return;
                }
            }

            questions.push({
                id: questionId,
                text: questionText,
                type: answerType,
                marks: marks,
                timeLimit: timeLimit,
                options: options.length > 0 ? options : null
            });
        });

        if (questions.length === 0) {
            showAlert('Please add at least one question', 'error');
            return;
        }

        const quizData = {
            id: quizId,
            title: quizTitle,
            description: quizDescription,
            createdAt: new Date().toISOString(),
            questions: questions,
            totalMarks: questions.reduce((sum, q) => sum + q.marks, 0)
        };

        console.log('Quiz data to save:', quizData);

        // Save to database
        saveQuiz(quizData)
            .then(response => {
                showAlert('Quiz published successfully!', 'success');
                // You might want to redirect or reset the form here
            })
            .catch(error => {
                console.error('Error publishing quiz:', error);
                showAlert('Error publishing quiz. Please try again.', 'error');
            });
    }

    // Show alert message
    function showAlert(message, type) {
        // In a real app, you might use a proper notification system
        alert(`${type.toUpperCase()}: ${message}`);
    }
});

