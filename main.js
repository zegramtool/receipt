// データストレージ（メモリ内）
let issuers = [
    {
        id: 1,
        name: '株式会社色禅　ZEGRAMTOOLS',
        address: '〒551-0031 大阪府大阪市大正区泉尾１丁目１８番２２号',
        phone: '050-7117-7851',
        invoiceNumber: 'T1120001228247',
        hankoImage: 'hanko.png'
    }
];

// グローバル変数
let shippingEnabled = false;

// 初期化処理を確実に実行
document.addEventListener('DOMContentLoaded', function() {
    // 初期化
    setTodayDate();
    document.getElementById('receiptNumber').value = generateReceiptNumber();
    updateIssuerSelect();
    updateIssuerList();
    calculateTax();
    
    // フォームのsubmitイベントを設定
    const receiptForm = document.getElementById('receiptForm');
    if (receiptForm) {
        receiptForm.addEventListener('submit', handleReceiptFormSubmit);
    }
    
    const issuerForm = document.getElementById('issuerForm');
    if (issuerForm) {
        issuerForm.addEventListener('submit', handleIssuerFormSubmit);
    }
    
    // iOS Safari対応
    if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
        document.addEventListener('touchstart', function() {}, {passive: true});
    }
    
    loadIssuers();
});

// 領収書フォーム送信処理
function handleReceiptFormSubmit(e) {
    e.preventDefault();
    
    const selectedIssuerId = document.getElementById('issuerSelect').value;
    const selectedIssuer = issuers.find(issuer => issuer.id == selectedIssuerId);
    
    if (!selectedIssuer) {
        alert('発行者を選択してください');
        return;
    }

    const productAmount = parseInt(document.getElementById('amount').value) || 0;
    const shippingAmount = shippingEnabled ? (parseInt(document.getElementById('shipping').value) || 0) : 0;
    const taxAmount = Math.floor(productAmount / 11);
    const totalAmount = productAmount + shippingAmount;
    const customerType = document.getElementById('customerType').value;
    const customerName = document.getElementById('customerName').value + ' ' + customerType;

    const formData = {
        receiptNumber: document.getElementById('receiptNumber').value,
        date: document.getElementById('date').value,
        customerName: customerName,
        productAmount: productAmount,
        shippingAmount: shippingAmount,
        shippingEnabled: shippingEnabled,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        description: document.getElementById('description').value,
        issuer: selectedIssuer
    };

    generateReceipt(formData);
}

// 発行者フォーム送信処理
function handleIssuerFormSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('hankoImageFile');
    const file = fileInput.files[0];
    const issuer = {
        id: Date.now(),
        name: document.getElementById('issuerName').value,
        address: document.getElementById('issuerAddress').value,
        phone: document.getElementById('issuerPhone').value,
        invoiceNumber: document.getElementById('invoiceNumber').value,
        hankoImage: ''
    };
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            issuer.hankoImage = evt.target.result;
            issuers.push(issuer);
            saveIssuers();
            updateIssuerSelect();
            updateIssuerList();
            document.getElementById('issuerForm').reset();
            alert('発行者情報を保存しました！（セッション中のみ有効）');
        };
        reader.readAsDataURL(file);
    } else {
        issuers.push(issuer);
        saveIssuers();
        updateIssuerSelect();
        updateIssuerList();
        document.getElementById('issuerForm').reset();
        alert('発行者情報を保存しました！（セッション中のみ有効）');
    }
}

// グローバル関数として定義（HTMLのonclickから呼び出せるように）

// タブ切り替え
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// 送料トグル機能
function toggleShipping() {
    shippingEnabled = !shippingEnabled;
    const toggleBtn = document.getElementById('shippingToggle');
    const toggleText = document.getElementById('toggleText');
    const shippingInput = document.getElementById('shippingInput');
    const shippingRow = document.getElementById('shippingRow');
    
    if (shippingEnabled) {
        toggleBtn.classList.add('active');
        toggleText.textContent = '送料あり';
        shippingInput.style.display = 'block';
        shippingRow.style.display = 'flex';
    } else {
        toggleBtn.classList.remove('active');
        toggleText.textContent = '送料なし';
        shippingInput.style.display = 'none';
        shippingRow.style.display = 'none';
        document.getElementById('shipping').value = '0';
    }
    
    calculateTax();
}

// 消費税計算（税込金額から逆算）
function calculateTax() {
    const productAmount = parseInt(document.getElementById('amount').value) || 0;
    const shippingAmount = shippingEnabled ? (parseInt(document.getElementById('shipping').value) || 0) : 0;
    const taxAmount = Math.floor(productAmount / 11); // 10%の税込から消費税を逆算
    const totalAmount = productAmount + shippingAmount;

    document.getElementById('productTotal').textContent = `¥${productAmount.toLocaleString()}`;
    document.getElementById('taxAmount').textContent = `¥${taxAmount.toLocaleString()}`;
    document.getElementById('shippingFee').textContent = `¥${shippingAmount.toLocaleString()}`;
    document.getElementById('totalAmount').innerHTML = `<strong>¥${totalAmount.toLocaleString()}</strong>`;
}

// 発行者削除
function deleteIssuer(id) {
    if (confirm('この発行者を削除しますか？')) {
        issuers = issuers.filter(issuer => issuer.id !== id);
        saveIssuers();
        updateIssuerSelect();
        updateIssuerList();
    }
}

// A4印刷機能（確実動作版）
function printReceipt() {
    window.print();
}

// PDF作成機能
function createPDF() {
    const receiptContent = document.getElementById('receiptContent').innerHTML;
    const selectedIssuerId = document.getElementById('issuerSelect').value;
    const selectedIssuer = issuers.find(issuer => issuer.id == selectedIssuerId);
    const hankoImage = selectedIssuer && selectedIssuer.hankoImage ? selectedIssuer.hankoImage : 'hanko.png';
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>領収書</title>
    <style>
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 20mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
        .receipt { max-width: 100%; }
        .hanko-img { position: absolute; left: 80%; bottom: -18px; width: 80px; height: 80px; object-fit: contain; opacity: 0.85; pointer-events: none; }
        .inshi-fuyou { width: 52px; height: 52px; border: 2px solid #333; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .inshi-fuyou .inshi-text { font-size: 8px; margin: 0; line-height: 1.05; }
        .inshi-fuyou .inshi-main { font-size: 11px; font-weight: bold; margin: 0; }
        @media print { body { padding: 20mm; } }
    </style>
</head>
<body>
    <div class="receipt">
        ${receiptContent.replace(/(<div style=\"font-size: 14px; margin-bottom: 5px; position: relative; display: inline-block;\">\s*インボイス登録番号：[^<]*)(<\/div>)/, `$1<img src='${hankoImage}' alt='電子印鑑' class='hanko-img'>$2`).replace(/<div style=\"width: 8%; border: 2px solid #333; padding: 8px; min-width: 40px; max-width: 60px;\">/g, `<div class='inshi-fuyou'>`).replace(/padding: 8px;/g, 'padding: 1px 8px;')}
    </div>
    <script>
        window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 1000);
        }
    <\/script>
</body>
</html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } else {
        alert('ポップアップブロックを解除してください');
    }
}

// 新規作成
function createNew() {
    document.getElementById('receiptForm').reset();
    document.getElementById('receiptPreview').style.display = 'none';
    setTodayDate();
    document.getElementById('receiptNumber').value = generateReceiptNumber();
    
    // 送料設定をリセット
    shippingEnabled = false;
    document.getElementById('shippingToggle').classList.remove('active');
    document.getElementById('toggleText').textContent = '送料なし';
    document.getElementById('shippingInput').style.display = 'none';
    document.getElementById('shippingRow').style.display = 'none';
    
    calculateTax();
    document.getElementById('description').value = 'お品代として';
}

// 内部関数
// 今日の日付を設定
function setTodayDate() {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    document.getElementById('date').value = todayString;
    document.getElementById('todayDate').textContent = 
        today.toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
}

// 領収書番号を生成
function generateReceiptNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    return `R-${year}${month}${day}-${time}`;
}

// 発行者データの保存（メモリ内のみ）
function saveIssuers() {
    localStorage.setItem('issuers', JSON.stringify(issuers));
}

// 発行者選択肢を更新
function updateIssuerSelect() {
    const select = document.getElementById('issuerSelect');
    select.innerHTML = '<option value="">発行者を選択してください</option>';
    
    issuers.forEach(issuer => {
        const option = document.createElement('option');
        option.value = issuer.id;
        option.textContent = issuer.name;
        select.appendChild(option);
    });
}

// 発行者リスト表示を更新
function updateIssuerList() {
    const list = document.getElementById('issuerList');
    list.innerHTML = '';
    
    if (issuers.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">発行者が登録されていません</p>';
        return;
    }

    issuers.forEach(issuer => {
        const item = document.createElement('div');
        item.className = 'issuer-item';
        item.innerHTML = `
            <div class="issuer-info">
                <div class="issuer-name">${issuer.name}</div>
                <div class="issuer-details">
                    ${issuer.address.replace(/\n/g, '<br>')}<br>
                    ${issuer.phone ? `TEL: ${issuer.phone}<br>` : ''}
                    インボイス番号: ${issuer.invoiceNumber}
                    ${issuer.hankoImage ? `<img src='${issuer.hankoImage || "hanko.png"}' alt='電子印鑑' style='width:32px;height:32px;object-fit:contain;border:1px solid #ccc;margin-top:4px;'>` : ''}
                </div>
            </div>
            <button class="delete-btn" onclick="deleteIssuer(${issuer.id})">削除</button>
        `;
        list.appendChild(item);
    });
}

// 領収書生成
function generateReceipt(data) {
    const dateObj = new Date(data.date);
    const formattedDate = dateObj.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '年').replace(/年(\d{2})年/, '年$1月') + '日';

    const receiptHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
            <div class="receipt-title" style="border: none; padding: 0; font-size: 32px; text-align: left; margin: 0;">
                領収書
            </div>
            <div style="text-align: right; font-size: 16px;">
                <div style="margin-bottom: 5px;">№ ${data.receiptNumber.replace('R-', '')}</div>
                <div>${formattedDate}</div>
            </div>
        </div>

        <div style="margin-bottom: 30px;">
            <div style="font-size: 20px; text-align: center; margin-bottom: 10px;">
                ${data.customerName}
            </div>
            <div style="border-bottom: 2px solid #333; width: 100%; margin-bottom: 20px;"></div>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <div style="font-size: 24px; margin-bottom: 10px;">
                ¥ ${data.totalAmount.toLocaleString()}
            </div>
            <div style="border-bottom: 2px solid #333; width: 100%; margin-bottom: 20px;"></div>
        </div>

        <div style="margin: 30px 0;">
            <div style="margin-bottom: 10px;">但　${data.description}</div>
            <div style="border-bottom: 1px solid #333; width: 100%; margin-bottom: 20px;"></div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <div style="margin-bottom: 10px;">上記の金額正に領収いたしました</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 40px;">
            <div style="width: 8%; border: 2px solid #333; padding: 8px; min-width: 40px; max-width: 60px;">
                <div class="inshi-fuyou">
                    <div class="inshi-text">電子領収書</div>
                    <div class="inshi-text">につき印紙</div>
                    <div class="inshi-main">不要</div>
                </div>
            </div>

            <div style="flex: 1; margin-left: 30px;">
                <div style="margin-bottom: 15px;">
                    <strong>【内訳】</strong>
                </div>
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                    <span>商品計　：</span>
                    <span>${data.productAmount.toLocaleString()} 円</span>
                </div>
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                    <span>（消費税　：</span>
                    <span>${data.taxAmount.toLocaleString()} 円）</span>
                </div>
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                    <span>消費税率：</span>
                    <span>10％</span>
                </div>
                ${data.shippingEnabled ? `
                <div style="margin-bottom: 15px; display: flex; justify-content: space-between;">
                    <span>送料　：</span>
                    <span>${data.shippingAmount.toLocaleString()} 円</span>
                </div>
                ` : ''}
                <div style="border-bottom: 1px solid #333; margin-bottom: 15px;"></div>
            </div>
        </div>

        <div style="text-align: right; margin-top: 40px; position: relative; min-height: 80px;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px; display: inline-block; position: relative;">
                ${data.issuer.name}
            </div>
            <div style="font-size: 14px; margin-bottom: 5px;">
                ${data.issuer.address.replace(/\n/g, '<br>')}
            </div>
            <div style="font-size: 14px; margin-bottom: 5px;">
                TEL：${data.issuer.phone}
            </div>
            <div style="font-size: 14px; margin-bottom: 5px; position: relative; display: inline-block;">
                インボイス登録番号：${data.issuer.invoiceNumber}
            </div>
        </div>
    `;

    document.getElementById('receiptContent').innerHTML = receiptHTML;
    document.getElementById('receiptPreview').style.display = 'block';
    document.getElementById('receiptPreview').classList.add('fade-in');
}

// これらの関数をグローバルスコープに明示的に設定
window.switchTab = switchTab;
window.toggleShipping = toggleShipping;
window.calculateTax = calculateTax;
window.deleteIssuer = deleteIssuer;
window.printReceipt = printReceipt;
window.createPDF = createPDF;
window.createNew = createNew;

// 発行者データの読み込み
function loadIssuers() {
    const data = localStorage.getItem('issuers');
    if (data) {
        issuers = JSON.parse(data);
    }
}
