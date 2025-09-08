// 領収書発行アプリ - ローカルストレージ版
// Firebase認証を削除し、完全にローカルストレージで動作

// グローバル変数
let issuers = [];
let receiptHistory = [];

// DOM読み込み完了時の処理
document.addEventListener('DOMContentLoaded', function() {
    console.log('アプリバージョン: 3.0.0 - ローカルストレージ専用版');
    console.log('初期化中...');
    
    // データをローカルストレージから読み込み
    loadIssuers();
    loadHistory();
    
    // 発行者データが空の場合はデフォルトデータを復元
    if (issuers.length === 0) {
        console.log('初期化時：発行者データが空のため復元します');
        restoreDefaultIssuer();
    }
    
    // 発行者選択リスト・一覧の更新
    updateIssuerSelect();
    updateIssuerList();
    
    // 履歴リストの更新
    updateHistoryList();
    
    // 日付と領収書番号の自動設定
    setAutoFields();
    
    // 初期計算
    calculateTax();
    
    // 発行者選択システムを初期化
    initIssuerSelection();
    
    // フォームのsubmitイベントを設定
    const receiptForm = document.getElementById('receiptForm');
    if (receiptForm) {
        receiptForm.addEventListener('submit', handleReceiptFormSubmit);
    }
    
    const issuerForm = document.getElementById('issuerForm');
    if (issuerForm) {
        issuerForm.addEventListener('submit', handleIssuerFormSubmit);
    }
    
    // 郵便番号自動入力機能を初期化
    initPostalCodeLookup();
    
    // ローカルストレージ版の初期化
    console.log('ローカルストレージ版として初期化中...');
    
    // ログインセクションを非表示
    const loginSection = document.getElementById('loginSection');
    if (loginSection) {
        loginSection.style.display = 'none';
    }
    
    // メインコンテンツを表示
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    console.log('初期化完了 - 認証なしローカルストレージ版');

    // プレビュー入力連動
    initPreviewBinding();
    updatePreview();
});

// 自動フィールド設定
function setAutoFields() {
    // 今日の日付を設定
    const today = new Date();
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today.toISOString().split('T')[0];
    }
    const todayDateEl = document.getElementById('todayDate');
    if (todayDateEl) {
        todayDateEl.textContent = today.toLocaleDateString('ja-JP');
    }
    
    // 領収書番号を自動生成（YYYYMMDD-HHMMSS形式）
    const receiptNumberInput = document.getElementById('receiptNumber');
    if (receiptNumberInput) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const receiptNumber = `${year}${month}${day}-${hours}${minutes}${seconds}`;
        receiptNumberInput.value = receiptNumber;
    }
}

// 税額計算
function calculateTax() {
    // フォーム要素の存在確認（HTMLの実態に合わせてフォールバック）
    const productAmountEl = document.getElementById('productAmount') || document.getElementById('amount');
    const shippingAmountEl = document.getElementById('shippingAmount'); // ない場合は0扱い
    const isElectronicReceiptEl = document.getElementById('isElectronicReceipt');
    const taxRateEl = document.getElementById('taxRate');

    if (!productAmountEl || !isElectronicReceiptEl) {
        console.log('calculateTax: 必要な要素が見つかりません');
        return;
    }

    const productAmount = parseFloat(productAmountEl.value) || 0;
    const shippingAmount = shippingAmountEl ? (parseFloat(shippingAmountEl.value) || 0) : 0;
    const isElectronicReceipt = isElectronicReceiptEl.checked;
    const taxRate = taxRateEl ? (parseFloat(taxRateEl.value) || 0.1) : 0.1;

    const subtotal = productAmount + shippingAmount;
    const taxAmount = Math.floor(subtotal * taxRate); // 小数点切り捨て
    const totalWithTax = subtotal + taxAmount;
    
    // 印紙税計算（電子領収書は不要）
    let stampDuty = 0;
    if (!isElectronicReceipt) {
        if (totalWithTax >= 50000000) stampDuty = 600;
        else if (totalWithTax >= 10000000) stampDuty = 400;
        else if (totalWithTax >= 5000000) stampDuty = 200;
        else if (totalWithTax >= 1000000) stampDuty = 200;
        else if (totalWithTax >= 500000) stampDuty = 200;
        else if (totalWithTax >= 100000) stampDuty = 200;
        else if (totalWithTax >= 50000) stampDuty = 200;
    }
    
    // 結果表示要素の存在確認
    // 画面上の表示要素（index.htmlのIDに合わせる）
    const subtotalDisplayEl = document.getElementById('productTotal');
    const taxDisplayEl = document.getElementById('taxAmount');
    const totalDisplayEl = document.getElementById('totalAmount');
    // const stampDutyDisplayEl = document.getElementById('stampDutyDisplay'); // 未使用
    
    // 結果を表示（要素が存在する場合のみ）
    if (subtotalDisplayEl) subtotalDisplayEl.textContent = `¥${subtotal.toLocaleString()}`;
    if (taxDisplayEl) taxDisplayEl.textContent = `¥${taxAmount.toLocaleString()}`;
    if (totalDisplayEl) totalDisplayEl.textContent = `¥${totalWithTax.toLocaleString()}`;
    // if (stampDutyDisplayEl) stampDutyDisplayEl.textContent = stampDuty.toLocaleString();
    
    // 印紙税行の表示/非表示
    // 印紙税表示行は現在のUIにはないため何もしない
}

// 印紙税トグル（HTMLから呼ばれる）
function toggleStampDuty() {
    calculateTax();
}

// 領収書フォーム送信処理
function handleReceiptFormSubmit(event) {
    event.preventDefault();
    
    const selectedIssuerId = document.getElementById('issuerSelect').value;
    if (!selectedIssuerId) {
        alert('発行者を選択してください。');
        return;
    }
    
    const selectedIssuer = issuers.find(issuer => issuer.id == selectedIssuerId);
    if (!selectedIssuer) {
        alert('選択された発行者が見つかりません。');
        return;
    }
    
    createPDF();
}

// PDF作成とプレビュー
function createPDF() {
    const customerName = document.getElementById('customerName').value;
    const customerType = document.getElementById('customerType').value;
    const amountEl = document.getElementById('productAmount') || document.getElementById('amount');
    const productAmount = amountEl ? (parseFloat(amountEl.value) || 0) : 0;
    const shippingAmountEl = document.getElementById('shippingAmount');
    const shippingAmount = shippingAmountEl ? (parseFloat(shippingAmountEl.value) || 0) : 0;
    const description = document.getElementById('description').value;
    const inputInvoiceNumber = document.getElementById('invoiceNumber')?.value || '';
    const receiptNumber = document.getElementById('receiptNumber').value;
    const date = document.getElementById('date').value;
    const isElectronicReceipt = document.getElementById('isElectronicReceipt').checked;
    const selectedIssuerId = document.getElementById('issuerSelect').value;
    const taxRateEl = document.getElementById('taxRate');
    const taxRate = taxRateEl ? (parseFloat(taxRateEl.value) || 0.1) : 0.1;
    
    const selectedIssuer = issuers.find(issuer => issuer.id == selectedIssuerId);
    
    const receiptData = {
        customerName,
        customerType,
        productAmount,
        shippingAmount,
        description,
        receiptNumber,
        date,
        isElectronicReceipt,
        issuer: selectedIssuer,
        invoiceNumber: inputInvoiceNumber,
        timestamp: new Date().toISOString(),
        taxRate
    };
    
    // 履歴に保存
    receiptHistory.unshift(receiptData);
    saveHistory();
    updateHistoryList();
    
    // プレビューに反映して同一ページ印刷（レイアウト統一）
    renderPreviewWithData(receiptData);
    window.print();
}

// 領収書HTML生成
function generateReceipt(data) {
    const subtotal = data.productAmount + data.shippingAmount;
    const taxRate = typeof data.taxRate === 'number' ? data.taxRate : 0.1;
    const taxAmount = Math.floor(subtotal * taxRate);
    const totalWithTax = subtotal + taxAmount;
    
    let stampDuty = 0;
    if (!data.isElectronicReceipt) {
        if (totalWithTax >= 50000000) stampDuty = 600;
        else if (totalWithTax >= 10000000) stampDuty = 400;
        else if (totalWithTax >= 5000000) stampDuty = 200;
        else if (totalWithTax >= 1000000) stampDuty = 200;
        else if (totalWithTax >= 500000) stampDuty = 200;
        else if (totalWithTax >= 100000) stampDuty = 200;
        else if (totalWithTax >= 50000) stampDuty = 200;
    }
    
    const formattedDate = new Date(data.date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>領収書 - ${data.receiptNumber}</title>
        <style>
            body {
                font-family: 'MS Gothic', monospace;
                margin: 20px;
                line-height: 1.6;
            }
            .receipt-container {
                max-width: 800px;
                margin: 0 auto;
                border: 2px solid #000;
                padding: 20px;
                background: white;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 1px solid #000;
                padding-bottom: 10px;
            }
            .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .receipt-number {
                font-size: 12px;
                margin-bottom: 5px;
            }
            .date {
                font-size: 12px;
            }
            .customer-info {
                margin: 20px 0;
                font-size: 16px;
                font-weight: bold;
            }
            .amount-section {
                margin: 20px 0;
                border: 2px solid #000;
                padding: 15px;
            }
            .amount-main {
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 15px;
                border-bottom: 1px solid #000;
                padding-bottom: 10px;
            }
            .amount-details {
                font-size: 14px;
            }
            .amount-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            .description {
                margin: 20px 0;
                font-size: 14px;
            }
            .issuer-section {
                margin-top: 30px;
                display: flex;
                justify-content: space-between;
            }
            .issuer-info {
                font-size: 14px;
                line-height: 1.4;
            }
            .stamp-area {
                width: 80px;
                height: 80px;
                border: 1px solid #666;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #666;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #666;
                border-top: 1px solid #ccc;
                padding-top: 10px;
            }
            @media print {
                body { margin: 0; }
                .receipt-container { border: none; }
            }
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <div class="header">
                <div class="title">領収書</div>
                <div class="receipt-number">領収書番号: ${data.receiptNumber}</div>
                <div class="date">発行日: ${formattedDate}</div>
            </div>
            
            <div class="customer-info">
                ${data.customerName} ${data.customerType}
            </div>
            
            <div class="amount-section">
                <div class="amount-main">
                    金額　¥${totalWithTax.toLocaleString()}
                </div>
                <div class="amount-details">
                    <div class="amount-row">
                        <span>小計:</span>
                        <span>¥${subtotal.toLocaleString()}</span>
                    </div>
                    <div class="amount-row">
                        <span>消費税 (${(taxRate * 100).toFixed(0)}%):</span>
                        <span>¥${taxAmount.toLocaleString()}</span>
                    </div>
                    ${stampDuty > 0 ? `
                    <div class="amount-row">
                        <span>印紙税:</span>
                        <span>¥${stampDuty.toLocaleString()}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="description">
                但し、${data.description}
            </div>
            
            <div class="issuer-section">
                <div class="issuer-info">
                    <div><strong>${data.issuer.name}</strong></div>
                    <div>〒${data.issuer.postalCode}</div>
                    <div>${data.issuer.address}</div>
                    ${data.issuer.phone ? `<div>TEL: ${data.issuer.phone}</div>` : ''}
                    ${ (data.invoiceNumber || data.issuer.invoiceNumber) ? `<div>インボイス番号: ${data.invoiceNumber || data.issuer.invoiceNumber}</div>` : ''}
                </div>
                <div class="stamp-area">
                    ${data.issuer && data.issuer.hankoImage ? `<img src="${data.issuer.hankoImage}" alt="印影" style="width:76px;height:76px;object-fit:contain;opacity:1;border-radius:50%;">` : '印'}
                </div>
            </div>
            
            
        </div>
        
        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000);
                }, 500);
            };
        </script>
    </body>
    </html>`;
}

// 領収書印刷
function printReceipt() {
    // 現在のフォーム値でプレビューを最新化して、そのまま印刷
    updatePreview();
    window.print();
}

// 入力リセット（新規作成）
function createNew() {
    const form = document.getElementById('receiptForm');
    if (form) form.reset();
    setAutoFields();
    calculateTax();
    const preview = document.getElementById('receiptPreview');
    if (preview) preview.style.display = 'none';
}

// 郵便番号自動入力システム
function initPostalCodeLookup() {
    console.log('🏣 郵便番号自動入力システムを初期化中...');
    
    // 確実にDOM要素を取得
    setTimeout(() => {
        const postalCodeInput = document.getElementById('issuerPostalCode');
        const addressInput = document.getElementById('issuerAddress');
        
        console.log('郵便番号フィールド:', postalCodeInput);
        console.log('住所フィールド:', addressInput);
        
        if (!postalCodeInput) {
            console.error('❌ 郵便番号入力フィールド(issuerPostalCode)が見つかりません');
            return;
        }
        
        if (!addressInput) {
            console.error('❌ 住所入力フィールド(issuerAddress)が見つかりません');
            return;
        }
        
        console.log('✅ 両方のフィールドが見つかりました');
        
        // 住所検索実行関数
        async function searchAddress() {
            const postalCode = postalCodeInput.value.trim();
            console.log('🔍 住所検索実行:', postalCode);
            
            if (!postalCode) {
                console.log('郵便番号が空です');
                return;
            }
            
            // 数字のみ抽出
            const cleanCode = postalCode.replace(/[^0-9]/g, '');
            
            if (cleanCode.length !== 7) {
                console.log(`郵便番号は7桁である必要があります。現在: ${cleanCode.length}桁`);
                showFeedback(postalCodeInput, 'error');
                return;
            }
            
            try {
                console.log('API呼び出し:', cleanCode);
                const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanCode}`;
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                console.log('API応答:', data);
                
                if (data.status === 200 && data.results && data.results.length > 0) {
                    const result = data.results[0];
                    const fullAddress = `${result.address1}${result.address2}${result.address3}`;
                    
                    // 住所フィールドが空の場合のみ入力
                    if (!addressInput.value.trim()) {
                        addressInput.value = fullAddress;
                        console.log('✅ 住所自動入力成功:', fullAddress);
                        showFeedback(addressInput, 'success');
                    } else {
                        console.log('住所が既に入力されているため、上書きしませんでした');
                    }
                } else {
                    console.log('❌ 住所が見つかりませんでした');
                    showFeedback(postalCodeInput, 'error');
                }
            } catch (error) {
                console.error('住所検索エラー:', error);
                showFeedback(postalCodeInput, 'error');
            }
        }
        
        // 視覚的フィードバック
        function showFeedback(element, type) {
            const color = type === 'success' ? '#28a745' : '#dc3545';
            element.style.borderColor = color;
            element.style.borderWidth = '2px';
            
            setTimeout(() => {
                element.style.borderColor = '';
                element.style.borderWidth = '';
            }, 2000);
        }
        
        // イベントリスナー設定
        postalCodeInput.addEventListener('blur', searchAddress);
        
        postalCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchAddress();
            }
        });
        
        console.log('✅ 郵便番号自動入力システム初期化完了');
        
    }, 100); // DOM構築完了を待つ
}

// 発行者選択システム
function initIssuerSelection() {
    console.log('👥 発行者選択システムを初期化中...');
    
    setTimeout(() => {
        const issuerSelect = document.getElementById('issuerSelect');
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        
        console.log('発行者選択フィールド:', issuerSelect);
        console.log('インボイス番号フィールド:', invoiceNumberInput);
        
        if (!issuerSelect) {
            console.error('❌ 発行者選択フィールド(issuerSelect)が見つかりません');
            return;
        }
        
        // 発行者選択時の処理
        issuerSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            console.log('🏢 発行者選択変更:', selectedValue);
            
            try {
                if (!selectedValue || selectedValue === '') {
                    // 選択解除の場合
                    if (invoiceNumberInput) {
                        invoiceNumberInput.value = '';
                        console.log('インボイス番号をクリアしました');
                    }
                    return;
                }
                
                const selectedId = parseInt(selectedValue);
                if (isNaN(selectedId)) {
                    console.log('無効な発行者IDです:', selectedValue);
                    return;
                }
                
                // 発行者データから該当するものを検索
                console.log('発行者データ:', issuers);
                const selectedIssuer = issuers.find(issuer => issuer.id === selectedId);
                
                if (selectedIssuer) {
                    console.log('✅ 発行者見つかりました:', selectedIssuer.name);
                    
                    // インボイス番号の自動入力
                    if (invoiceNumberInput && selectedIssuer.invoiceNumber) {
                        if (!invoiceNumberInput.value) {
                            invoiceNumberInput.value = selectedIssuer.invoiceNumber;
                            console.log('✅ インボイス番号自動入力:', selectedIssuer.invoiceNumber);
                        } else {
                            console.log('インボイス番号は既に入力済みのため上書きしません');
                        }
                    }
                } else {
                    console.log('❌ 選択された発行者が見つかりません ID:', selectedId);
                    console.log('利用可能な発行者一覧:', issuers.map(i => `ID:${i.id} 名前:${i.name}`));
                }
                
            } catch (error) {
                console.error('💥 発行者選択処理でエラー:', error);
                console.error('エラー詳細:', error.message);
                console.error('スタック:', error.stack);
            }
            // プレビュー更新
            updatePreview();
        });
        
        console.log('✅ 発行者選択システム初期化完了');
        
    }, 100);
}

// 発行者フォーム送信処理
function handleIssuerFormSubmit(event) {
    event.preventDefault();
    const editingIndex = parseInt(document.getElementById('editingIssuerIndex').value);

    const name = (document.getElementById('issuerName')?.value || '').trim();
    const postalCode = (document.getElementById('issuerPostalCode')?.value || '').trim();
    const address = (document.getElementById('issuerAddress')?.value || '').trim();
    const phone = (document.getElementById('issuerPhone')?.value || '').trim();
    const invoiceNumber = (document.getElementById('issuerInvoiceNumber')?.value || '').trim();

    const fileInput = document.getElementById('hankoImageFile');
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

    const baseData = {
        id: editingIndex >= 0 ? issuers[editingIndex].id : Date.now(),
        name,
        postalCode,
        address,
        phone,
        invoiceNumber,
        hankoImage: editingIndex >= 0 ? (issuers[editingIndex].hankoImage || 'icons/sample-hanko.png') : 'icons/sample-hanko.png'
    };

    const finalize = (issuerData) => {
        if (editingIndex >= 0) {
            issuers[editingIndex] = issuerData;
        } else {
            issuers.push(issuerData);
        }
        saveIssuers();
        updateIssuerSelect();
        updateIssuerList();
        resetIssuerForm();
        updatePreview();
        const message = editingIndex >= 0 ? '発行者を更新しました' : '発行者を登録しました';
        alert(message);
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = () => finalize({ ...baseData, hankoImage: reader.result });
        reader.onerror = () => {
            console.error('印影画像の読み込みに失敗しました');
            finalize(baseData);
        };
        reader.readAsDataURL(file);
    } else {
        finalize(baseData);
    }
}

// 発行者フォームリセット
function resetIssuerForm() {
    document.getElementById('issuerForm').reset();
    document.getElementById('editingIssuerIndex').value = '-1';
}

// 発行者編集キャンセル
function cancelEdit() {
    resetIssuerForm();
}

// 発行者編集
function editIssuer(index) {
    const issuer = issuers[index];
    if (issuer) {
        document.getElementById('issuerName').value = issuer.name || '';
        document.getElementById('issuerPostalCode').value = issuer.postalCode || '';
        document.getElementById('issuerAddress').value = issuer.address || '';
        document.getElementById('issuerPhone').value = issuer.phone || '';
        document.getElementById('issuerInvoiceNumber').value = issuer.invoiceNumber || '';
        document.getElementById('editingIssuerIndex').value = index;
        
        switchTab('issuer');
    }
}

// 発行者削除
function deleteIssuer(index) {
    if (confirm('この発行者を削除しますか？')) {
        issuers.splice(index, 1);
        saveIssuers();
        updateIssuerSelect();
        updateIssuerList();
        updatePreview();
        alert('発行者を削除しました');
    }
}

// タブ切り替え
function switchTab(tabName) {
    // すべてのタブボタンからactiveクラスを削除
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // すべてのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // アクティブなタブボタンにクラス追加
    const activeTabBtn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    if (activeTabBtn) {
        activeTabBtn.classList.add('active');
    }
    
    // アクティブなタブコンテンツを表示
    const activeTabContent = document.getElementById(tabName + 'Tab');
    if (activeTabContent) {
        activeTabContent.classList.add('active');
    }
    
    // 領収書タブの場合、自動計算を実行
    if (tabName === 'receipt') {
        setTimeout(() => { calculateTax(); updatePreview(); }, 100);
    }
}

// データ読み込み・保存機能
function loadIssuers() {
    const saved = localStorage.getItem('issuers');
    if (saved) {
        try {
            issuers = JSON.parse(saved);
        } catch (e) {
            console.error('発行者データの読み込みエラー:', e);
            issuers = getDefaultIssuers();
            // 破損時はデフォルトを書き戻す
            try { saveIssuers(); } catch (_) {}
        }
    } else {
        issuers = getDefaultIssuers();
        // 初回はローカルストレージに保存
        try { saveIssuers(); } catch (_) {}
    }
}

function saveIssuers() {
    localStorage.setItem('issuers', JSON.stringify(issuers));
}

function loadHistory() {
    const saved = localStorage.getItem('receiptHistory');
    if (saved) {
        try {
            receiptHistory = JSON.parse(saved);
        } catch (e) {
            console.error('履歴データの読み込みエラー:', e);
            receiptHistory = [];
        }
    } else {
        receiptHistory = [];
    }
}

function saveHistory() {
    localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory));
}

function getDefaultIssuers() {
    return [
        {
            id: 1,
            name: "株式会社サンプル",
            postalCode: "100-0001",
            address: "東京都千代田区千代田1-1-1",
            phone: "03-1234-5678",
            invoiceNumber: "T1234567890123",
            hankoImage: "icons/sample-hanko.png"
        }
    ];
}

// サンプルデータ復元機能
function restoreDefaultIssuer() {
    console.log('🔄 サンプルデータ復元機能を実行');
    console.log('現在の発行者数:', issuers.length);
    
    try {
        // 常にデフォルトサンプルを追加（重複チェック）
        const defaultIssuers = getDefaultIssuers();
        let addedCount = 0;
        
        defaultIssuers.forEach(defaultIssuer => {
            // IDが重複していないかチェック
            const exists = issuers.some(issuer => issuer.id === defaultIssuer.id);
            if (!exists) {
                issuers.push({...defaultIssuer}); // オブジェクトのコピーを追加
                addedCount++;
            }
        });
        
        if (addedCount > 0) {
            console.log(`✅ ${addedCount}件のデフォルト発行者を追加しました`);
            saveIssuers();
            updateIssuerSelect();
            updateIssuerList();
            updatePreview();
            
            alert(`サンプル発行者を${addedCount}件復元しました！`);
            return true;
        } else {
            console.log('📝 すべてのデフォルト発行者は既に存在します');
            alert('サンプル発行者は既に存在します');
            return false;
        }
        
    } catch (error) {
        console.error('💥 サンプルデータ復元でエラー:', error);
        alert('サンプルデータの復元に失敗しました');
        return false;
    }
}

// UI更新機能
function updateIssuerSelect() {
    console.log('🔄 発行者選択リストを更新中...');
    
    try {
        const select = document.getElementById('issuerSelect');
        if (!select) {
            console.error('❌ 発行者選択フィールドが見つかりません');
            return;
        }
        
        // 現在の選択を保存
        const currentValue = select.value;
        
        // リストをクリアして初期オプションを追加
        select.innerHTML = '<option value="">発行者を選択してください</option>';
        
        // 発行者データが存在する場合のみ処理
        if (issuers && issuers.length > 0) {
            console.log(`📋 ${issuers.length}件の発行者をリストに追加中...`);
            
            issuers.forEach((issuer, index) => {
                try {
                    const option = document.createElement('option');
                    option.value = issuer.id;
                    option.textContent = issuer.name || `発行者${index + 1}`;
                    select.appendChild(option);
                    console.log(`  ✓ ${issuer.name} (ID: ${issuer.id})`);
                } catch (error) {
                    console.error(`発行者${index}の追加でエラー:`, error);
                }
            });
            
            // 以前の選択を復元（存在する場合）
            if (currentValue) {
                select.value = currentValue;
                if (select.value !== currentValue) {
                    console.log(`以前の選択 ${currentValue} は存在しないため、選択をクリアしました`);
                }
            }
            
            console.log('✅ 発行者選択リスト更新完了');
        } else {
            console.log('📭 発行者データが空です');
        }
        
    } catch (error) {
        console.error('💥 発行者選択リスト更新でエラー:', error);
    }
}

function updateIssuerList() {
    const issuerList = document.getElementById('issuerList');
    if (!issuerList) return;
    
    issuerList.innerHTML = '';
    
    if (issuers.length === 0) {
        issuerList.innerHTML = '<p style="text-align: center; color: #666; margin-top: 20px;">登録済みの発行者がありません</p>';
        return;
    }
    
    issuers.forEach((issuer, index) => {
        const issuerItem = document.createElement('div');
        issuerItem.className = 'issuer-item';
        
        issuerItem.innerHTML = `
            <div class="issuer-info">
                <h3>${issuer.name}</h3>
                <p>〒${issuer.postalCode}</p>
                <p>${issuer.address}</p>
                ${issuer.phone ? `<p>TEL: ${issuer.phone}</p>` : ''}
                ${issuer.invoiceNumber ? `<p class="invoice-number">インボイス: ${issuer.invoiceNumber}</p>` : ''}
                ${issuer.hankoImage ? `<div class="hanko-preview" style="margin-top:8px;"><img src="${issuer.hankoImage}" alt="印影" width="48" height="48" /></div>` : ''}
            </div>
            <div class="issuer-actions">
                <button onclick="editIssuer(${index})" class="edit-btn">編集</button>
                <button onclick="deleteIssuer(${index})" class="delete-btn">削除</button>
            </div>
        `;
        
        issuerList.appendChild(issuerItem);
    });
}

function updateHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    if (receiptHistory.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #666; margin-top: 20px;">履歴がありません</p>';
        return;
    }
    
    receiptHistory.forEach((receipt, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const subtotal = (receipt.productAmount || 0) + (receipt.shippingAmount || 0);
        const rate = typeof receipt.taxRate === 'number' ? receipt.taxRate : 0.1;
        const taxAmount = Math.floor(subtotal * rate);
        const totalWithTax = subtotal + taxAmount;
        const date = new Date(receipt.timestamp || receipt.date).toLocaleDateString('ja-JP');
        
        historyItem.innerHTML = `
            <div class="history-info">
                <h4>${receipt.customerName} ${receipt.customerType}</h4>
                <p class="amount">¥${totalWithTax.toLocaleString()}</p>
                <p class="description">${receipt.description}</p>
                <p class="date">${date} - ${receipt.receiptNumber}</p>
                <p class="issuer">発行者: ${receipt.issuer ? receipt.issuer.name : '不明'}</p>
            </div>
            <div class="history-actions">
                <button onclick="reprintReceipt(${index})" class="reprint-btn">再印刷</button>
                <button onclick="deleteHistory(${index})" class="delete-btn">削除</button>
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// 履歴関連機能
function reprintReceipt(index) {
    const receipt = receiptHistory[index];
    if (receipt) {
        renderPreviewWithData(receipt);
        window.print();
    }
}

function deleteHistory(index) {
    if (confirm('この履歴を削除しますか？')) {
        receiptHistory.splice(index, 1);
        saveHistory();
        updateHistoryList();
    }
}

// 履歴全クリア
function clearHistory() {
    if (confirm('全ての履歴を削除しますか？この操作は元に戻せません。')) {
        receiptHistory = [];
        saveHistory();
        updateHistoryList();
    }
}

// プレビューのイベント連動
function initPreviewBinding() {
    const ids = [
        'customerName', 'customerType', 'amount', 'productAmount', 'shippingAmount',
        'description', 'receiptNumber', 'date', 'isElectronicReceipt',
        'issuerSelect', 'taxRate', 'invoiceNumber'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
    });
}

// プレビュー更新
function updatePreview() {
    const previewWrap = document.getElementById('receiptPreview');
    const container = document.getElementById('receiptContent');
    if (!previewWrap || !container) return;

    const amountEl = document.getElementById('productAmount') || document.getElementById('amount');
    const productAmount = amountEl ? (parseFloat(amountEl.value) || 0) : 0;
    const shippingAmountEl = document.getElementById('shippingAmount');
    const shippingAmount = shippingAmountEl ? (parseFloat(shippingAmountEl.value) || 0) : 0;
    const taxRateEl = document.getElementById('taxRate');
    const taxRate = taxRateEl ? (parseFloat(taxRateEl.value) || 0.1) : 0.1;

    const data = {
        customerName: document.getElementById('customerName')?.value || '',
        customerType: document.getElementById('customerType')?.value || '様',
        productAmount,
        shippingAmount,
        description: document.getElementById('description')?.value || '',
        receiptNumber: document.getElementById('receiptNumber')?.value || '',
        date: document.getElementById('date')?.value || new Date().toISOString().split('T')[0],
        isElectronicReceipt: document.getElementById('isElectronicReceipt')?.checked || false,
        issuer: (() => {
            const id = document.getElementById('issuerSelect')?.value;
            return issuers.find(i => String(i.id) === String(id));
        })(),
        invoiceNumber: document.getElementById('invoiceNumber')?.value || '',
        taxRate
    };

    // 必須が揃っていない場合は非表示
    if (!data.issuer || !data.customerName) {
        previewWrap.style.display = 'none';
        return;
    }

    container.innerHTML = generateReceiptPreviewHtml(data);
    previewWrap.style.display = 'block';
}

// 明示データでプレビューを描画
function renderPreviewWithData(data) {
    const previewWrap = document.getElementById('receiptPreview');
    const container = document.getElementById('receiptContent');
    if (!previewWrap || !container) return;
    container.innerHTML = generateReceiptPreviewHtml(data);
    previewWrap.style.display = 'block';
    // 領収書タブへ切替
    try { switchTab('receipt'); } catch (_) {}
}

// プレビュー用のHTML生成（indexのスタイルに合わせる）
function generateReceiptPreviewHtml(data) {
    const subtotal = (data.productAmount || 0) + (data.shippingAmount || 0);
    const rate = typeof data.taxRate === 'number' ? data.taxRate : 0.1;
    const taxAmount = Math.floor(subtotal * rate);
    const totalWithTax = subtotal + taxAmount;
    const formattedDate = new Date(data.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    // 印紙税計算（電子発行なら不要）
    let stampDuty = 0;
    if (!data.isElectronicReceipt) {
        if (totalWithTax >= 50000000) stampDuty = 600;
        else if (totalWithTax >= 10000000) stampDuty = 400;
        else if (totalWithTax >= 5000000) stampDuty = 200;
        else if (totalWithTax >= 1000000) stampDuty = 200;
        else if (totalWithTax >= 500000) stampDuty = 200;
        else if (totalWithTax >= 100000) stampDuty = 200;
        else if (totalWithTax >= 50000) stampDuty = 200;
    }

    const inshiBox = data.isElectronicReceipt
        ? `<div class="inshi-fuyou"><p class="inshi-text">電子発行のため</p><p class="inshi-main">印紙税不要</p></div>`
        : `<div class="inshi-fuyou"><p class="inshi-text">収入印紙</p><p class="inshi-main">¥${stampDuty.toLocaleString()}</p></div>`;

    return `
    <div class="receipt fade-in">
        <div class="receipt-title">領収書</div>
        <div class="customer-section">
            ${data.customerName} ${data.customerType}
        </div>
        <div class="receipt-info">
            <div class="receipt-row"><span>発行日:</span><span>${formattedDate}</span></div>
            <div class="receipt-row"><span>領収書番号:</span><span>${data.receiptNumber}</span></div>
            <div class="receipt-row"><span>但し:</span><span>${data.description}</span></div>
            <div class="receipt-row"><span>小計:</span><span>¥${subtotal.toLocaleString()}</span></div>
            <div class="receipt-row"><span>消費税 (${(rate*100).toFixed(0)}%):</span><span>¥${taxAmount.toLocaleString()}</span></div>
            <div class="receipt-row total"><span>合計:</span><span>¥${totalWithTax.toLocaleString()}</span></div>
        </div>
        <div class="receipt-header">
            <div class="issuer-info">
                <div><strong>${data.issuer.name}</strong></div>
                <div>〒${data.issuer.postalCode}</div>
                <div>${data.issuer.address}</div>
                ${data.issuer.phone ? `<div>TEL: ${data.issuer.phone}</div>` : ''}
                ${(data.invoiceNumber || data.issuer.invoiceNumber) ? `<div>インボイス番号: ${data.invoiceNumber || data.issuer.invoiceNumber}</div>` : ''}
            </div>
            <div class="stamp-box">
                ${data.issuer && data.issuer.hankoImage ? `<img class=\"hanko-img\" src=\"${data.issuer.hankoImage}\" alt=\"印影\" style=\"width:80px;height:80px;object-fit:contain;opacity:1;\">` : ''}
                ${inshiBox}
            </div>
        </div>
    </div>`;
}
