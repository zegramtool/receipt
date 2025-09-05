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
    
    // 発行者選択リストの更新
    updateIssuerSelect();
    
    // 履歴リストの更新
    updateHistoryList();
    
    // 日付と領収書番号の自動設定
    setAutoFields();
    
    // 初期計算
    calculateTax();
    
    // 発行者選択時のイベントハンドラー（インボイス番号自動入力）
    const issuerSelect = document.getElementById('issuerSelect');
    if (issuerSelect) {
        issuerSelect.addEventListener('change', function() {
            const selectedIssuerId = parseInt(this.value);
            console.log('発行者選択:', selectedIssuerId);
            
            if (selectedIssuerId && issuers) {
                const selectedIssuer = issuers.find(issuer => issuer.id === selectedIssuerId);
                if (selectedIssuer && selectedIssuer.invoiceNumber) {
                    const invoiceInput = document.getElementById('invoiceNumber');
                    if (invoiceInput) {
                        invoiceInput.value = selectedIssuer.invoiceNumber;
                        console.log('インボイス番号を自動入力しました:', selectedIssuer.invoiceNumber);
                    }
                } else {
                    console.log('選択された発行者のインボイス番号が見つかりません:', selectedIssuer);
                }
            } else if (selectedIssuerId === '') {
                // 発行者選択をクリアした場合、インボイス番号もクリア
                const invoiceInput = document.getElementById('invoiceNumber');
                if (invoiceInput) {
                    invoiceInput.value = '';
                    console.log('インボイス番号をクリアしました');
                }
            }
        });
    }
    
    // フォームのsubmitイベントを設定
    const receiptForm = document.getElementById('receiptForm');
    if (receiptForm) {
        receiptForm.addEventListener('submit', handleReceiptFormSubmit);
    }
    
    const issuerForm = document.getElementById('issuerForm');
    if (issuerForm) {
        issuerForm.addEventListener('submit', handleIssuerFormSubmit);
    }
    
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
});

// 自動フィールド設定
function setAutoFields() {
    // 今日の日付を設定
    const today = new Date();
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = today.toISOString().split('T')[0];
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
    const productAmount = parseFloat(document.getElementById('productAmount').value) || 0;
    const shippingAmount = parseFloat(document.getElementById('shippingAmount').value) || 0;
    const isElectronicReceipt = document.getElementById('isElectronicReceipt').checked;
    
    const subtotal = productAmount + shippingAmount;
    const taxAmount = Math.floor(subtotal * 0.1); // 消費税10%、小数点切り捨て
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
    
    // 結果を表示
    document.getElementById('subtotalDisplay').textContent = subtotal.toLocaleString();
    document.getElementById('taxDisplay').textContent = taxAmount.toLocaleString();
    document.getElementById('totalDisplay').textContent = totalWithTax.toLocaleString();
    document.getElementById('stampDutyDisplay').textContent = stampDuty.toLocaleString();
    
    // 印紙税行の表示/非表示
    const stampRow = document.getElementById('stampDutyRow');
    if (stampRow) {
        stampRow.style.display = stampDuty > 0 ? 'table-row' : 'none';
    }
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
    const productAmount = parseFloat(document.getElementById('productAmount').value) || 0;
    const shippingAmount = parseFloat(document.getElementById('shippingAmount').value) || 0;
    const description = document.getElementById('description').value;
    const receiptNumber = document.getElementById('receiptNumber').value;
    const date = document.getElementById('date').value;
    const isElectronicReceipt = document.getElementById('isElectronicReceipt').checked;
    const selectedIssuerId = document.getElementById('issuerSelect').value;
    
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
        timestamp: new Date().toISOString()
    };
    
    // 履歴に保存
    receiptHistory.unshift(receiptData);
    saveHistory();
    updateHistoryList();
    
    // 領収書HTMLを生成
    const receiptHTML = generateReceipt(receiptData);
    
    // 新しいウィンドウで表示して印刷
    printReceipt(receiptHTML);
}

// 領収書HTML生成
function generateReceipt(data) {
    const subtotal = data.productAmount + data.shippingAmount;
    const taxAmount = Math.floor(subtotal * 0.1);
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
                        <span>消費税 (10%):</span>
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
                    <div>TEL: ${data.issuer.phone}</div>
                    ${data.issuer.invoiceNumber ? `<div>インボイス番号: ${data.issuer.invoiceNumber}</div>` : ''}
                </div>
                <div class="stamp-area">
                    印
                </div>
            </div>
            
            <div class="footer">
                ${data.isElectronicReceipt ? 'この領収書は電子領収書です（印紙税不要）' : ''}
                <br>
                領収書発行アプリ で作成
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
function printReceipt(html) {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    } else {
        alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
    }
}

// 発行者フォーム送信処理
function handleIssuerFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const editingIndex = parseInt(document.getElementById('editingIssuerIndex').value);
    
    const issuerData = {
        id: editingIndex >= 0 ? issuers[editingIndex].id : Date.now(),
        name: formData.get('name'),
        postalCode: formData.get('postalCode'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        invoiceNumber: formData.get('invoiceNumber'),
        hankoImage: "icons/sample-hanko.png"
    };
    
    if (editingIndex >= 0) {
        issuers[editingIndex] = issuerData;
    } else {
        issuers.push(issuerData);
    }
    
    saveIssuers();
    updateIssuerSelect();
    updateIssuerList();
    resetIssuerForm();
    
    const message = editingIndex >= 0 ? '発行者を更新しました' : '発行者を登録しました';
    alert(message);
}

// 発行者フォームリセット
function resetIssuerForm() {
    document.getElementById('issuerForm').reset();
    document.getElementById('editingIssuerIndex').value = '-1';
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
        setTimeout(calculateTax, 100);
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
        }
    } else {
        issuers = getDefaultIssuers();
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

// UI更新機能
function updateIssuerSelect() {
    const select = document.getElementById('issuerSelect');
    if (select) {
        select.innerHTML = '<option value="">発行者を選択してください</option>';
        
        issuers.forEach(issuer => {
            const option = document.createElement('option');
            option.value = issuer.id;
            option.textContent = issuer.name;
            select.appendChild(option);
        });
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
                <p>TEL: ${issuer.phone}</p>
                ${issuer.invoiceNumber ? `<p class="invoice-number">インボイス: ${issuer.invoiceNumber}</p>` : ''}
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
        const taxAmount = Math.floor(subtotal * 0.1);
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
        const receiptHTML = generateReceipt(receipt);
        printReceipt(receiptHTML);
    }
}

function deleteHistory(index) {
    if (confirm('この履歴を削除しますか？')) {
        receiptHistory.splice(index, 1);
        saveHistory();
        updateHistoryList();
    }
}