// Configuração do Supabase
const SUPABASE_URL = 'https://tdpakzbezbucuoaafkej.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcGFremJlemJ1Y3VvYWFma2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NTk5MjksImV4cCI6MjA1NjIzNTkyOX0.R_e6Xpqw-k8nwPLL60AsKm8iJ1TcHsF9_Zps9SE1FVM';

// Cria a instância do Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuração do Storage (nome do bucket corrigido)
const storage = supabase.storage.from('fotosavaliacoes');

document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');
  const nextStepBtn = document.getElementById('nextStepBtn');
  const backToStep1Btn = document.getElementById('backToStep1Btn');
  const backToStep2Btn = document.getElementById('backToStep2Btn');
  const saveSectionBtn = document.getElementById('saveSectionBtn');
  const finishEvaluationBtn = document.getElementById('finishEvaluationBtn');
  const backToStep2FromReport = document.getElementById('backToStep2FromReport');
  const printReportBtn = document.getElementById('printReportBtn');
  const newEvaluationBtn = document.getElementById('newEvaluationBtn');
  const channelSelect = document.getElementById('channel');
  const unitSelect = document.getElementById('unit');
  const responsibleSelect = document.getElementById('responsible');
  const sectionsContainer = document.getElementById('sections-container');
  const questionsContainer = document.getElementById('questions-container');
  const reportContainer = document.getElementById('report-container');
  const currentSectionName = document.getElementById('current-section-name');
  const currentSectionTitle = document.getElementById('current-section-title');
  const sectionStatusDot = document.getElementById('section-status-dot');
  const sectionStatusText = document.getElementById('section-status-text');
  
  const stepIndicators = {
    step1: document.getElementById('step1-indicator'),
    step2: document.getElementById('step2-indicator'),
    step3: document.getElementById('step3-indicator'),
    step4: document.getElementById('step4-indicator')
  };
  
  // Evaluation data structure
  let evaluationData = {
    info: {
      channel: '',
      channelName: '',
      unit: '',
      unitName: '',
      responsible: '',
      responsibleName: '',
      date: '',
      startTime: null,
      endTime: null
    },
    sections: {},
    questions: [],
    currentSection: null,
    totalScore: 0
  };
  
  // Set today's date as default
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
  
  // Load initial data (apenas canais)
  loadInitialData();
  
  // Função para converter Data URL para Blob
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  // Função para fazer upload de fotos
  async function uploadPhoto(file) {
    const fileName = `${Date.now()}-${file.name || 'photo'}`;
    
    try {
      // Faz upload do arquivo
      const { error: uploadError } = await storage.upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Obtém URL pública
      const { data: { publicUrl } } = storage.getPublicUrl(fileName);
      return publicUrl;
      
    } catch (error) {
      console.error('Erro no upload da foto:', error);
      showNotification(`Erro no upload: ${error.message}`, 'error');
      throw error;
    }
  }

  // Teste de conexão com o bucket
  async function testBucketConnection() {
    try {
      const { data, error } = await supabase
        .storage
        .from('fotosavaliacoes')
        .list();
      
      if (error) {
        console.error('Erro ao acessar bucket:', error);
      } else {
        console.log('Conexão com bucket bem-sucedida. Conteúdo:', data);
      }
    } catch (e) {
      console.error('Falha grave ao acessar bucket:', e);
    }
  }

  // Load initial data from Supabase (só canais)
  async function loadInitialData() {
    try {
      // Testar conexão com o bucket
      await testBucketConnection();
      
      // Load channels
      const { data: channels, error: channelsError } = await supabase
        .from('canais')
        .select('*')
        .order('nome', { ascending: true });
      
      if (channelsError) throw channelsError;
      
      // Populate channel select
      channelSelect.innerHTML = '<option value="" disabled selected>Selecione o canal</option>';
      channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = channel.nome;
        channelSelect.appendChild(option);
      });
      
      // Load units (will be populated when channel is selected)
      unitSelect.innerHTML = '<option value="" disabled selected>Selecione o canal primeiro</option>';
      
      // Load responsibles (will be populated when unit is selected)
      responsibleSelect.innerHTML = '<option value="" disabled selected>Selecione a unidade primeiro</option>';
      
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      showNotification('Ocorreu um erro ao carregar os dados. Por favor, recarregue a página.', 'error');
    }
  }
  
  // Função para carregar dados do canal (seções e perguntas)
  async function loadChannelData(channelId) {
    try {
      // Carregar seções do canal
      const { data: sections, error: sectionsError } = await supabase
        .from('modelo_secoes')
        .select('*')
        .eq('canal_id', channelId)
        .order('ordem', { ascending: true });
      
      if (sectionsError) throw sectionsError;
      
      // Carregar perguntas do canal
      const { data: questions, error: questionsError } = await supabase
        .from('modelo_perguntas')
        .select('*')
        .eq('canal_id', channelId)
        .order('ordem', { ascending: true });
      
      if (questionsError) throw questionsError;
      
      return { sections, questions };
      
    } catch (error) {
      console.error('Erro ao carregar dados do canal:', error);
      throw error;
    }
  }
  
  // Event listener for channel selection
  channelSelect.addEventListener('change', async function() {
    const channelId = this.value;
    if (!channelId) return;
    
    try {
      // Load units for selected channel
      const { data: units, error } = await supabase
        .from('unidades')
        .select('*')
        .eq('canal_id', channelId);
      
      if (error) throw error;
      
      // Populate unit select
      unitSelect.innerHTML = '<option value="" disabled selected>Selecione a unidade</option>';
      units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = unit.nome;
        unitSelect.appendChild(option);
      });
      
      // Clear responsible select
      responsibleSelect.innerHTML = '<option value="" disabled selected>Selecione a unidade primeiro</option>';
      
      // Carregar seções e perguntas do canal
      const channelData = await loadChannelData(channelId);
      
      // Resetar dados de avaliação
      evaluationData.sections = {};
      evaluationData.questions = channelData.questions || [];
      
      // Store sections in evaluationData
      channelData.sections.forEach(section => {
        evaluationData.sections[section.id] = {
          id: section.id,
          name: section.nome,
          descricao: section.descricao,
          icone: section.icone,
          completed: false,
          questions: [],
          progress: 0
        };
      });
      
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      showNotification('Ocorreu um erro ao carregar as unidades. Por favor, tente novamente.', 'error');
    }
  });
  
  // Event listener for unit selection
  unitSelect.addEventListener('change', async function() {
    const unitId = this.value;
    if (!unitId) return;
    
    try {
      // Load responsibles for selected unit
      const { data: responsibles, error } = await supabase
        .from('responsaveis')
        .select('*')
        .eq('unidade_id', unitId);
      
      if (error) throw error;
      
      // Populate responsible select
      responsibleSelect.innerHTML = '<option value="" disabled selected>Selecione o responsável</option>';
      responsibles.forEach(responsible => {
        const option = document.createElement('option');
        option.value = responsible.id;
        option.textContent = responsible.nome;
        responsibleSelect.appendChild(option);
      });
      
    } catch (error) {
      console.error('Erro ao carregar responsáveis:', error);
      showNotification('Ocorreu um erro ao carregar os responsáveis. Por favor, tente novamente.', 'error');
    }
  });
  
  // Next Step Button Handler
  nextStepBtn.addEventListener('click', function() {
    const channelId = document.getElementById('channel').value;
    const channelName = document.getElementById('channel').options[document.getElementById('channel').selectedIndex].text;
    const unitId = document.getElementById('unit').value;
    const unitName = document.getElementById('unit').options[document.getElementById('unit').selectedIndex].text;
    const responsibleId = document.getElementById('responsible').value;
    const responsibleName = document.getElementById('responsible').options[document.getElementById('responsible').selectedIndex].text;
    const date = document.getElementById('date').value;
    
    if (!channelId || !unitId || !responsibleId || !date) {
      showNotification('Por favor, preencha todas as informações antes de prosseguir.', 'warning');
      return;
    }
    
    // Verificar se há seções para este canal
    if (Object.keys(evaluationData.sections).length === 0) {
      showNotification('Não há seções disponíveis para este canal. Por favor, selecione outro canal ou entre em contato com o administrador.', 'error');
      return;
    }
    
    // Save info
    evaluationData.info = { 
      channel: channelId,
      channelName,
      unit: unitId,
      unitName,
      responsible: responsibleId,
      responsibleName,
      date,
      startTime: new Date()
    };
    
    // Hide step 1, show step 2
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    
    // Update step indicator
    stepIndicators.step1.classList.remove('active');
    stepIndicators.step2.classList.add('active');
    
    // Render sections
    renderSections();
  });
  
  // Function to render sections
  function renderSections() {
    sectionsContainer.innerHTML = '';
    
    const sections = Object.keys(evaluationData.sections);
    
    if (sections.length === 0) {
      sectionsContainer.innerHTML = `
        <div class="no-sections">
          <i class="ri-information-line"></i> Nenhuma seção disponível para este canal
        </div>
      `;
      return;
    }
    
    sections.forEach(sectionId => {
      const section = evaluationData.sections[sectionId];
      
      const sectionCard = document.createElement('div');
      sectionCard.className = 'section-card';
      sectionCard.dataset.section = sectionId;
      sectionCard.id = `card-${sectionId}`;
      
      sectionCard.innerHTML = `
        <div class="section-icon">
          <i class="${section.icone || 'ri-folder-open-line'}"></i>
        </div>
        <div class="section-content">
          <h3 class="section-title">${section.name}</h3>
          <p class="section-desc">${section.descricao || 'Descrição não disponível'}</p>
          <div class="progress-container">
            <div class="progress-text" id="progress-text-${sectionId}">${section.progress}%</div>
            <div class="progress-bar">
              <div class="progress" id="progress-${sectionId}" style="width: ${section.progress}%"></div>
            </div>
          </div>
          <div class="section-status">
            <span class="status-dot status-pending"></span>
            <span>Pendente</span>
          </div>
        </div>
      `;
      
      sectionCard.addEventListener('click', function() {
        const section = this.getAttribute('data-section');
        evaluationData.currentSection = section;
        currentSectionName.textContent = evaluationData.sections[section].name;
        currentSectionTitle.textContent = evaluationData.sections[section].name;
        
        // Update section status
        updateSectionStatusUI(section);
        
        // Load questions for this section
        loadSectionQuestions(section);
        
        // Hide step 2, show step 3
        step2.classList.add('hidden');
        step3.classList.remove('hidden');
        
        // Update step indicator
        stepIndicators.step2.classList.remove('active');
        stepIndicators.step3.classList.add('active');
        
        // Visual feedback
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.style.transform = '';
        }, 200);
      });
      
      sectionsContainer.appendChild(sectionCard);
    });
  }
  
  // Back to Step 1 Button Handler
  backToStep1Btn.addEventListener('click', function() {
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
    
    // Update step indicator
    stepIndicators.step2.classList.remove('active');
    stepIndicators.step1.classList.add('active');
  });
  
  // Back to Step 2 from Step 3
  backToStep2Btn.addEventListener('click', function() {
    step3.classList.add('hidden');
    step2.classList.remove('hidden');
    
    // Update step indicator
    stepIndicators.step3.classList.remove('active');
    stepIndicators.step2.classList.add('active');
  });
  
  // Save Section Button Handler
  saveSectionBtn.addEventListener('click', function() {
    const sectionId = evaluationData.currentSection;
    const sectionData = evaluationData.sections[sectionId];
    
    // Get all answers and observations
    const questionElements = document.querySelectorAll('.question-container');
    sectionData.questions = [];
    
    questionElements.forEach(questionEl => {
      const questionId = parseInt(questionEl.querySelector('.option-btn')?.getAttribute('data-question') || 0);
      const selectedOption = questionEl.querySelector('.option-btn.selected');
      const observation = questionEl.querySelector('textarea').value;
      
      // Get photos for this question
      const photoPreviews = questionEl.querySelectorAll('.photo-preview');
      const photos = Array.from(photoPreviews).map(img => img.src);
      
      // Find the original question text
      const questionText = evaluationData.questions.find(q => q.id === questionId && q.secao_id === sectionId)?.texto || '';
      
      sectionData.questions.push({
        id: questionId,
        texto: questionText,
        resposta: selectedOption?.getAttribute('data-value') || null,
        observacao: observation,
        fotos: photos
      });
    });
    
    // Calculate progress
    const answeredQuestions = sectionData.questions.filter(q => q.resposta !== null).length;
    const totalQuestions = evaluationData.questions.filter(q => q.secao_id === sectionId).length;
    sectionData.progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
    
    // Mark section as completed if all questions answered
    sectionData.completed = answeredQuestions === totalQuestions && totalQuestions > 0;
    
    // Update UI
    const sectionCard = document.getElementById(`card-${sectionId}`);
    sectionCard.classList.remove('completed', 'partial');
    const statusElement = sectionCard.querySelector('.section-status');
    
    if (sectionData.completed) {
      sectionCard.classList.add('completed');
      statusElement.innerHTML = `
        <span class="status-dot status-completed"></span>
        <span>Completo</span>
      `;
    } else if (sectionData.progress > 0) {
      sectionCard.classList.add('partial');
      statusElement.innerHTML = `
        <span class="status-dot status-partial"></span>
        <span>Parcial (${sectionData.progress}%)</span>
      `;
    } else {
      statusElement.innerHTML = `
        <span class="status-dot status-pending"></span>
        <span>Pendente</span>
      `;
    }
    
    document.getElementById(`progress-${sectionId}`).style.width = `${sectionData.progress}%`;
    document.getElementById(`progress-text-${sectionId}`).textContent = `${sectionData.progress}%`;
    
    // Update current section status UI
    updateSectionStatusUI(sectionId);
    
    // Check if all sections are completed
    checkAllSectionsCompleted();
    
    // Hide step 3, show step 2
    step3.classList.add('hidden');
    step2.classList.remove('hidden');
    
    // Update step indicator
    stepIndicators.step3.classList.remove('active');
    stepIndicators.step2.classList.add('active');
    
    // Notification
    showNotification(`Avaliação da seção "${sectionData.name}" salva com sucesso!`, 'success');
  });
  
  // Update section status UI
  function updateSectionStatusUI(sectionId) {
    const sectionData = evaluationData.sections[sectionId];
    
    if (sectionData.completed) {
      sectionStatusDot.className = 'status-dot status-completed';
      sectionStatusText.textContent = 'Completo';
    } else if (sectionData.progress > 0) {
      sectionStatusDot.className = 'status-dot status-partial';
      sectionStatusText.textContent = `Parcial (${sectionData.progress}%)`;
    } else {
      sectionStatusDot.className = 'status-dot status-pending';
      sectionStatusText.textContent = 'Pendente';
    }
  }
  
  // Finish Evaluation Button Handler
  finishEvaluationBtn.addEventListener('click', async function() {
    // Salvar estado original do botão
    const originalButtonHTML = finishEvaluationBtn.innerHTML;
    finishEvaluationBtn.innerHTML = '<i class="ri-loader-4-line spin"></i> Salvando...';
    finishEvaluationBtn.disabled = true;
    
    try {
      // Registrar o horário de término
      evaluationData.info.endTime = new Date();

      // Calcular a nota total
      let totalQuestions = 0;
      let conformes = 0;
      
      Object.keys(evaluationData.sections).forEach(sectionId => {
        const section = evaluationData.sections[sectionId];
        if (section.questions) {
          section.questions.forEach(question => {
            totalQuestions++;
            if (question.resposta === 'conforme') conformes++;
          });
        }
      });
      
      evaluationData.totalScore = totalQuestions > 0 
        ? Math.round((conformes / totalQuestions) * 100) 
        : 0;

      // 1. Salvar avaliação principal
      const { data: avaliacao, error: avError } = await supabase
        .from('avaliacoes')
        .insert([{
          canal_id: evaluationData.info.channel,
          unidade_id: evaluationData.info.unit,
          responsavel_id: evaluationData.info.responsible,
          data: evaluationData.info.date,
          inicio: evaluationData.info.startTime.toISOString(),
          fim: evaluationData.info.endTime.toISOString(),
          nota_total: evaluationData.totalScore
        }])
        .select('id')
        .single();

      if (avError) throw avError;

      // 2. Salvar seções e respostas
      for (const sectionId in evaluationData.sections) {
        const section = evaluationData.sections[sectionId];
        
        // Salvar seção
        const { data: secao, error: secError } = await supabase
          .from('secoes_avaliacao')
          .insert([{
            avaliacao_id: avaliacao.id,
            modelo_secao_id: sectionId,
            progresso: section.progress,
            completa: section.completed
          }])
          .select('id')
          .single();

        if (secError) throw secError;

        // 3. Salvar respostas e fotos
        for (const question of section.questions) {
          // Salvar resposta com as novas colunas
          const { data: resposta, error: resError } = await supabase
            .from('respostas')
            .insert([{
              secao_avaliacao_id: secao.id,
              modelo_pergunta_id: question.id,
              resposta: question.resposta,
              observacao: question.observacao,
              // Novas colunas adicionadas
              responsavel_id: evaluationData.info.responsible,
              unidade_id: evaluationData.info.unit,
              avaliacao_id: avaliacao.id
            }])
            .select('id')
            .single();

          if (resError) throw resError;

          // 4. Salvar fotos (se existirem)
          if (question.fotos && question.fotos.length > 0) {
            for (const foto of question.fotos) {
              // Se for Data URL, converter para blob e fazer upload
              let photoUrl = foto;
              
              if (foto.startsWith('data:image')) {
                const blob = dataURLtoBlob(foto);
                photoUrl = await uploadPhoto(blob);
              }
              
              await supabase
                .from('fotos_respostas')
                .insert([{
                  resposta_id: resposta.id,
                  url: photoUrl
                }]);
            }
          }
        }
      }

      // Gerar relatório local
      generateReport();
      
      // Notificação de sucesso
      showNotification('Avaliação salva com sucesso!', 'success');
      
      // Hide step 2, show step 4
      step2.classList.add('hidden');
      step4.classList.remove('hidden');
      
      // Update step indicator
      stepIndicators.step2.classList.remove('active');
      stepIndicators.step4.classList.add('active');
      
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      showNotification(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
      finishEvaluationBtn.innerHTML = originalButtonHTML;
      finishEvaluationBtn.disabled = false;
    }
  });

  // Back to Step 2 from Report
  backToStep2FromReport.addEventListener('click', function() {
    step4.classList.add('hidden');
    step2.classList.remove('hidden');
    
    // Update step indicator
    stepIndicators.step4.classList.remove('active');
    stepIndicators.step2.classList.add('active');
  });
  
  // Print Report Button Handler
  printReportBtn.addEventListener('click', function() {
    window.print();
  });
  
  // New Evaluation Button Handler
  newEvaluationBtn.addEventListener('click', function() {
    // Reset evaluation data
    resetEvaluation();
    
    // Hide step 4, show step 1
    step4.classList.add('hidden');
    step1.classList.remove('hidden');
    
    // Update step indicator
    stepIndicators.step4.classList.remove('active');
    stepIndicators.step1.classList.add('active');
  });
  
  // Function to load section questions
  function loadSectionQuestions(sectionId) {
    questionsContainer.innerHTML = '';
    
    // Get questions for this section
    const questions = evaluationData.questions
      .filter(q => q.secao_id === sectionId)
      .sort((a, b) => a.ordem - b.ordem);
    
    const sectionData = evaluationData.sections[sectionId];
    
    questions.forEach((question, index) => {
      const savedQuestion = sectionData.questions.find(q => q.id === question.id);
      
      const questionDiv = document.createElement('div');
      questionDiv.className = 'question-container';
      questionDiv.innerHTML = `
        <div class="question-text">${index + 1}. ${question.texto}</div>
        <div class="options-container">
          <button type="button" 
            class="option-btn success ${savedQuestion?.resposta === 'conforme' ? 'selected' : ''}" 
            data-question="${question.id}" 
            data-value="conforme">
            <i class="ri-check-line"></i> Conforme
          </button>
          <button type="button" 
            class="option-btn error ${savedQuestion?.resposta === 'inconforme' ? 'selected' : ''}" 
            data-question="${question.id}" 
            data-value="inconforme">
            <i class="ri-close-line"></i> Inconforme
          </button>
          <button type="button" 
            class="option-btn warning ${savedQuestion?.resposta === 'na' ? 'selected' : ''}" 
            data-question="${question.id}" 
            data-value="na">
            <i class="ri-indeterminate-mini-line"></i> Não se aplica
          </button>
        </div>
        <div class="observation-container">
          <label>Observações:</label>
          <textarea class="form-control" rows="2" placeholder="Adicione observações sobre esta questão..." 
            data-question="${question.id}">${savedQuestion?.observacao || ''}</textarea>
        </div>
        <div class="photo-upload">
          <i class="ri-camera-line"></i>
          <div class="upload-text">Clique ou arraste para adicionar fotos</div>
          <div class="upload-hint">Formatos suportados: JPG, PNG (Máx. 5MB)</div>
          <input type="file" accept="image/*" multiple style="display: none;" data-question="${question.id}">
          <div class="photo-preview-container" id="preview-${sectionId}-${question.id}">
            ${savedQuestion?.fotos?.map(photo => `
              <div style="position: relative;">
                <img src="${photo}" class="photo-preview">
                <div class="remove-photo">&times;</div>
              </div>
            `).join('') || ''}
          </div>
        </div>
      `;
      
      questionsContainer.appendChild(questionDiv);
      
      // Add event listeners for option buttons
      const optionButtons = questionDiv.querySelectorAll('.option-btn');
      optionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          // Remove selected class from all buttons in this group
          optionButtons.forEach(b => b.classList.remove('selected'));
          
          // Add selected class to clicked button
          this.classList.add('selected');
        });
      });
      
      // Add event listener for photo upload
      const photoUpload = questionDiv.querySelector('.photo-upload');
      const fileInput = photoUpload.querySelector('input[type="file"]');
      const previewContainer = photoUpload.querySelector('.photo-preview-container');
      
      photoUpload.addEventListener('click', function(e) {
        // Don't trigger file input if clicking on existing photo or remove button
        if (e.target.closest('.photo-preview') || e.target.classList.contains('remove-photo')) {
          return;
        }
        fileInput.click();
      });
      
      // Handle remove photo
      previewContainer.querySelectorAll('.remove-photo').forEach(btn => {
        btn.addEventListener('click', function() {
          this.parentElement.remove();
        });
      });
      
      fileInput.addEventListener('change', async function(e) {
        const files = Array.from(e.target.files);
        for (const file of files) {
          if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = function(e) {
              const img = document.createElement('img');
              img.src = e.target.result;
              img.className = 'photo-preview';
              
              const removeBtn = document.createElement('div');
              removeBtn.className = 'remove-photo';
              removeBtn.innerHTML = '&times;';
              removeBtn.addEventListener('click', function() {
                img.parentElement.remove();
              });
              
              const wrapper = document.createElement('div');
              wrapper.style.position = 'relative';
              wrapper.appendChild(img);
              wrapper.appendChild(removeBtn);
              
              previewContainer.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
          } else if (file.size > 5 * 1024 * 1024) {
            showNotification('O arquivo excede o tamanho máximo permitido de 5MB', 'warning');
          }
        }
      });
    });
  }
  
  // Function to check if all sections are completed
  function checkAllSectionsCompleted() {
    const allCompleted = Object.values(evaluationData.sections).every(section => section.completed);
    finishEvaluationBtn.classList.toggle('hidden', !allCompleted);
  }
  
  // Function to generate report
  function generateReport() {
    reportContainer.innerHTML = '';
    
    // Calculate statistics
    let totalQuestions = 0;
    let conformeCount = 0;
    let inconformeCount = 0;
    let naCount = 0;
    let nullCount = 0;
    
    // Calculate totals
    Object.keys(evaluationData.sections).forEach(sectionId => {
      const section = evaluationData.sections[sectionId];
      if (section.questions && section.questions.length > 0) {
        section.questions.forEach(question => {
          totalQuestions++;
          switch(question.resposta) {
            case 'conforme': conformeCount++; break;
            case 'inconforme': inconformeCount++; break;
            case 'na': naCount++; break;
            default: nullCount++;
          }
        });
      }
    });
    
    // Formatar horários e duração
    const startTime = evaluationData.info.startTime;
    const endTime = evaluationData.info.endTime;
    
    let startText = "Não registrado";
    let endText = "Não registrado";
    let durationText = "Não registrado";
    
    if (startTime) {
      startText = startTime.toLocaleTimeString('pt-BR');
      
      if (endTime) {
        endText = endTime.toLocaleTimeString('pt-BR');
        
        // Calcular duração em milissegundos
        const durationMs = endTime - startTime;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        
        durationText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    // Report header
    const reportHeader = document.createElement('div');
    reportHeader.className = 'report-header';
    reportHeader.innerHTML = `
      <div>
        <h1 class="report-title">Relatório de Avaliação</h1>
        <div class="report-meta">
          <div class="report-meta-item"><span class="report-meta-label">Canal:</span> ${evaluationData.info.channelName}</div>
          <div class="report-meta-item"><span class="report-meta-label">Unidade:</span> ${evaluationData.info.unitName}</div>
          <div class="report-meta-item"><span class="report-meta-label">Responsável:</span> ${evaluationData.info.responsibleName}</div>
          <div class="report-meta-item"><span class="report-meta-label">Data:</span> ${formatDate(evaluationData.info.date)}</div>
          <div class="report-meta-item"><span class="report-meta-label">Início:</span> ${startText}</div>
          <div class="report-meta-item"><span class="report-meta-label">Término:</span> ${endText}</div>
          <div class="report-meta-item"><span class="report-meta-label">Duração:</span> ${durationText}</div>
        </div>
      </div>
      <img src="image 2.png">
    `;
    reportContainer.appendChild(reportHeader);
    
    // Add sections
    Object.keys(evaluationData.sections).forEach(sectionId => {
      const section = evaluationData.sections[sectionId];
      
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'report-section';
      sectionDiv.innerHTML = `
        <h2 class="report-section-title">
          <i class="${section.icone || 'ri-folder-open-line'}"></i> ${section.name}
          <span class="section-status-badge ${section.completed ? 'completed' : 'pending'}">
            ${section.completed ? 'Completo' : 'Pendente'}
          </span>
        </h2>
        <div class="section-stats">
          <div class="stat-item">
            <span class="stat-label">Progresso:</span>
            <div class="stat-value">${section.progress}%</div>
          </div>
          <div class="stat-item">
            <span class="stat-label">Conformidade:</span>
            <div class="stat-value">${calculateSectionConformity(section)}%</div>
          </div>
          <div class="stat-item">
            <span class="stat-label">Questões:</span>
            <div class="stat-value">${section.questions.length}</div>
          </div>
        </div>
      `;
      
      // Add questions for this section
      if (section.questions && section.questions.length > 0) {
        section.questions.forEach((question, index) => {
          const questionDiv = document.createElement('div');
          questionDiv.className = 'report-question';
          
          let answerClass = '';
          let answerText = '';
          let answerIcon = '';
          
          switch(question.resposta) {
            case 'conforme':
              answerClass = 'answer-conforme';
              answerText = 'Conforme';
              answerIcon = '<i class="ri-checkbox-circle-fill"></i>';
              break;
            case 'inconforme':
              answerClass = 'answer-inconforme';
              answerText = 'Inconforme';
              answerIcon = '<i class="ri-close-circle-fill"></i>';
              break;
            case 'na':
              answerClass = 'answer-na';
              answerText = 'Não se aplica';
              answerIcon = '<i class="ri-indeterminate-circle-fill"></i>';
              break;
            default:
              answerClass = 'answer-null';
              answerText = 'Não respondido';
              answerIcon = '<i class="ri-question-fill"></i>';
          }
          
          questionDiv.innerHTML = `
            <div class="question-header">
              <div class="question-number">${index + 1}.</div>
              <div class="question-text-container">
                <div class="report-question-text">${question.texto}</div>
                <div class="report-answer ${answerClass}">
                  ${answerIcon} ${answerText}
                </div>
              </div>
            </div>
            ${question.observacao ? `
              <div class="report-observation">
                <div class="observation-title">
                  <i class="ri-chat-1-line"></i> Observação:
                </div>
                <div class="observation-text">${question.observacao}</div>
              </div>
            ` : ''}
            ${question.fotos && question.fotos.length > 0 ? `
              <div class="report-photos">
                <div class="photos-title">
                  <i class="ri-image-line"></i> Fotos anexadas (${question.fotos.length})
                </div>
                <div class="photos-grid">
                  ${question.fotos.map(photo => `
                    <div class="photo-item">
                      <img src="${photo}" alt="Foto da avaliação" class="photo-thumbnail">
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          `;
          
          sectionDiv.appendChild(questionDiv);
        });
      } else {
        sectionDiv.innerHTML += `
          <div class="no-questions">
            <i class="ri-information-line"></i> Nenhuma questão respondida para esta seção
          </div>
        `;
      }
      
      reportContainer.appendChild(sectionDiv);
    });
    
    // Add summary section
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'report-summary';
    summaryDiv.innerHTML = `
      <h2 class="report-section-title">
        <i class="ri-bar-chart-2-line"></i> Resumo Estatístico
      </h2>
      <div class="summary-grid">
        <!-- Novo cartão para a nota total -->
        <div class="summary-card total-score">
          <div class="summary-value">${evaluationData.totalScore}%</div>
          <div class="summary-label">Nota Total</div>
        </div>
        <div class="summary-card total">
          <div class="summary-value">${totalQuestions}</div>
          <div class="summary-label">Total de Questões</div>
        </div>
        <div class="summary-card conforme">
          <div class="summary-value">${conformeCount}</div>
          <div class="summary-label">Conformes</div>
          <div class="summary-percent">${totalQuestions > 0 ? Math.round((conformeCount / totalQuestions) * 100) : 0}%</div>
        </div>
        <div class="summary-card inconforme">
          <div class="summary-value">${inconformeCount}</div>
          <div class="summary-label">Inconformes</div>
          <div class="summary-percent">${totalQuestions > 0 ? Math.round((inconformeCount / totalQuestions) * 100) : 0}%</div>
        </div>
        <div class="summary-card na">
          <div class="summary-value">${naCount}</div>
          <div class="summary-label">Não Aplicável</div>
          <div class="summary-percent">${totalQuestions > 0 ? Math.round((naCount / totalQuestions) * 100) : 0}%</div>
        </div>
      </div>
      <div class="conformity-chart">
        <div class="chart-bar conforme" style="width: ${totalQuestions > 0 ? (conformeCount / totalQuestions) * 100 : 0}%"></div>
        <div class="chart-bar inconforme" style="width: ${totalQuestions > 0 ? (inconformeCount / totalQuestions) * 100 : 0}%"></div>
        <div class="chart-bar na" style="width: ${totalQuestions > 0 ? (naCount / totalQuestions) * 100 : 0}%"></div>
      </div>
    `;
    reportContainer.appendChild(summaryDiv);
    
    // Add print-specific styles
    addPrintStyles();
  }
  
  // Helper function to calculate section conformity percentage
  function calculateSectionConformity(section) {
    if (!section.questions || section.questions.length === 0) return 0;
    
    const total = section.questions.length;
    const conforme = section.questions.filter(q => q.resposta === 'conforme').length;
    const na = section.questions.filter(q => q.resposta === 'na').length;
    
    return Math.round(((conforme + na) / total) * 100);
  }
  
  // Helper function to format date
  function formatDate(dateString) {
    if (!dateString) return '';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  }
  
  // Function to add print-specific styles
  function addPrintStyles() {
    // Remove existing print styles if any
    const existingPrintStyles = document.getElementById('print-styles');
    if (existingPrintStyles) {
      existingPrintStyles.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'print-styles';
    style.textContent = `
      @media print {
        body {
          background: white !important;
          color: black !important;
          padding: 0 !important;
          font-size: 10pt !important;
        }
        
        .container {
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        .card {
          box-shadow: none !important;
          border: none !important;
          page-break-inside: avoid;
        }
        
        .card-header {
          background: var(--primary) !important;
          color: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 2px solid var(--primary);
        }
        
        .report-title {
          color: var(--primary) !important;
          font-size: 20pt !important;
          margin-bottom: 10px !important;
        }
        
        .report-meta {
          font-size: 9pt !important;
        }
        
        .report-meta-item {
          margin-bottom: 5px !important;
        }
        
        .report-section {
          page-break-inside: avoid;
          margin-bottom: 25px !important;
        }
        
        .report-section-title {
          font-size: 14pt !important;
          color: var(--primary) !important;
          border-bottom: 1px solid var(--accent) !important;
          padding-bottom: 5px !important;
          margin-bottom: 15px !important;
        }
        
        .section-status-badge {
          font-size: 8pt;
          padding: 2px 8px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .section-stats {
          font-size: 9pt;
          gap: 15px;
        }
        
        .report-question {
          margin-bottom: 15px;
          padding-bottom: 10px;
        }
        
        .report-question-text {
          font-size: 10pt !important;
        }
        
        .report-answer {
          font-size: 9pt !important;
          padding: 2px 10px !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .report-observation {
          font-size: 9pt !important;
          padding: 8px !important;
        }
        
        .photos-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        
        .photo-thumbnail {
          max-height: 150px;
          object-fit: contain;
        }
        
        .summary-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 10px !important;
        }
        
        .summary-value {
          font-size: 18pt !important;
        }
        
        .summary-label {
          font-size: 9pt !important;
        }
        
        .summary-percent {
          font-size: 10pt !important;
        }
        
        .footer, .hidden {
          display: none !important;
        }
        
        @page {
          size: A4;
          margin: 1cm;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Function to reset evaluation data
  function resetEvaluation() {
    evaluationData = {
      info: {
        channel: '',
        channelName: '',
        unit: '',
        unitName: '',
        responsible: '',
        responsibleName: '',
        date: '',
        startTime: null,
        endTime: null
      },
      sections: {},
      questions: [],
      currentSection: null,
      totalScore: 0
    };
    
    // Reset form
    document.getElementById('channel').value = '';
    document.getElementById('unit').value = '';
    document.getElementById('responsible').value = '';
    document.getElementById('date').value = today;
    
    // Clear sections container
    sectionsContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Carregando seções...</p></div>';
    
    finishEvaluationBtn.classList.add('hidden');
  }
  
  // Function to show notification
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 25px';
    notification.style.background = type === 'success' 
      ? 'var(--success)' 
      : type === 'error' 
        ? 'var(--error)' 
        : 'var(--warning)';
    notification.style.color = 'white';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    notification.style.zIndex = '1000';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.transition = 'all 0.3s ease';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
});
