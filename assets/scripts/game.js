// キャンバスの取得と設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// キャンバスをデバイスの全画面に設定
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// スケーリングの基準となる値（画面の短辺を基準にする）
let scale = Math.min(canvas.width, canvas.height) / 800; // 基準値800は調整可能

// 跳ね返り係数（0〜1の範囲）
let restitution = 0.9;

// オプション設定の取得
const penaltyGoalCheckbox = document.getElementById('penaltyGoal');
const penaltyPaddleCheckbox = document.getElementById('penaltyPaddle');
const allowInvasionCheckbox = document.getElementById('allowInvasion'); // 相手陣地への侵入を許可
const alwaysShowPaddleCheckbox = document.getElementById('alwaysShowPaddle'); // マレットを常時表示

// スコア表示の要素
const scoreElement = document.getElementById('score');

// 設定アイコンとオプション画面の要素
const settingsIcon = document.getElementById('settingsIcon');
const optionsMenu = document.getElementById('options');
const closeOptionsButton = document.getElementById('closeOptions');

// ゴール時のメッセージ表示要素
const goalMessage = document.getElementById('goalMessage');

// マレットの初期質量
const initialPaddleMass = 1;

// スコアの初期化
let scores = [0, 0]; // [Player 1, Player 2]

// マレットのサイズを現在の2倍に設定（元のサイズの4倍）
const basePaddleRadius = 50 * scale * 2; // 元のサイズの2倍
let paddleRadius = basePaddleRadius;

// パックのサイズをマレットサイズの0.7倍に設定
let puckRadius = paddleRadius * 0.7;

// ゴールサイズの初期設定（マレットサイズ × 1.5）
let goalWidth = paddleRadius * 2 * 1.5;

// ボールの初期設定
let puck = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: puckRadius,
    speedX: 500 * (Math.random() > 0.5 ? 1 : -1) * scale,
    speedY: 500 * (Math.random() > 0.5 ? 1 : -1) * scale,
    mass: 1
};

// ボールの色をベージュに設定
const puckColor = '#F5F5DC'; // ベージュ

// プレイヤーのラケット設定
let paddles = [
    {
        x: canvas.width / 2,
        y: canvas.height - paddleRadius * 2,
        radius: paddleRadius,
        mass: initialPaddleMass, // 質量を設定
        isTouching: false,
        touchId: null,
        visible: alwaysShowPaddleCheckbox.checked, // オプションに基づいて表示
        prevX: canvas.width / 2,
        prevY: canvas.height - paddleRadius * 2,
        vx: 0, // 速度を追加
        vy: 0,
        color: '#FF0000' // 赤
    },
    {
        x: canvas.width / 2,
        y: paddleRadius * 2,
        radius: paddleRadius,
        mass: initialPaddleMass, // 質量を設定
        isTouching: false,
        touchId: null,
        visible: alwaysShowPaddleCheckbox.checked, // オプションに基づいて表示
        prevX: canvas.width / 2,
        prevY: paddleRadius * 2,
        vx: 0, // 速度を追加
        vy: 0,
        color: '#0000FF' // 青
    }
];

// 壁の太さ（スケーリング適用）
let wallThickness = 10 * scale;

// 背景色を黒に設定
function clearCanvas() {
    ctx.fillStyle = '#000000'; // 黒
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// タッチイベントの設定
canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, false);
canvas.addEventListener('touchend', handleTouchEnd, false);
canvas.addEventListener('touchcancel', handleTouchEnd, false);

function handleTouchStart(e) {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        // タッチ位置に最も近い未使用のマレットを探す
        let paddle = null;
        let minDistance = Infinity;
        for (let p of paddles) {
            if (!p.isTouching) {
                const dx = p.x - touchX;
                const dy = p.y - touchY;
                const distance = dx * dx + dy * dy;
                if (distance < minDistance) {
                    minDistance = distance;
                    paddle = p;
                }
            }
        }

        if (paddle) {
            paddle.isTouching = true;
            paddle.touchId = touch.identifier;
            paddle.prevX = touchX;
            paddle.prevY = touchY;
            paddle.x = touchX;
            paddle.y = touchY;
            paddle.visible = true;
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        for (let paddle of paddles) {
            if (paddle.touchId === touch.identifier) {
                // 前回の位置を保存
                paddle.prevX = paddle.x;
                paddle.prevY = paddle.y;

                // マレットの位置をタッチ位置に設定
                paddle.x = touch.clientX;
                paddle.y = touch.clientY;

                // 境界内に制限する処理を追加
                enforcePaddleBoundaries(paddle);
            }
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        for (let paddle of paddles) {
            if (paddle.touchId === touch.identifier) {
                paddle.isTouching = false;
                paddle.touchId = null;
                if (!alwaysShowPaddleCheckbox.checked) {
                    paddle.visible = false;
                }
            }
        }
    }
}

// マレットの位置を境界内に制限する関数を修正
function enforcePaddleBoundaries(paddle) {
    // 左右の境界
    const minX = paddle.radius + wallThickness;
    const maxX = canvas.width - paddle.radius - wallThickness;

    // ゴールエリアへの侵入を許可する深さ
    const goalDepth = paddle.radius / 2;

    // 上下の境界
    let minY, maxY;
    if (allowInvasionCheckbox.checked) {
        minY = paddle.radius + wallThickness - goalDepth;
        maxY = canvas.height - paddle.radius - wallThickness + goalDepth;
    } else {
        if (paddle === paddles[0]) {
            minY = canvas.height / 2 + paddle.radius;
            maxY = canvas.height - paddle.radius - wallThickness;
        } else {
            minY = paddle.radius + wallThickness;
            maxY = canvas.height / 2 - paddle.radius;
        }
    }

    paddle.x = Math.max(minX, Math.min(maxX, paddle.x));
    paddle.y = Math.max(minY, Math.min(maxY, paddle.y));
}

// ゴールフラグの追加
let isGoal = false;

// 壁との衝突処理（パックのみ）
function handleWallCollision() {
    // 左の壁との衝突
    if (puck.x - puck.radius < wallThickness) {
        puck.x = puck.radius + wallThickness;
        puck.speedX = -puck.speedX * restitution;
    }
    // 右の壁との衝突
    if (puck.x + puck.radius > canvas.width - wallThickness) {
        puck.x = canvas.width - puck.radius - wallThickness;
        puck.speedX = -puck.speedX * restitution;
    }
    // 上の壁との衝突（ゴールエリアを除く）
    if (puck.y - puck.radius < wallThickness) {
        if (
            puck.x + puck.radius > (canvas.width / 2 - goalWidth / 2) &&
            puck.x - puck.radius < (canvas.width / 2 + goalWidth / 2)
        ) {
            // ゴールエリアなので壁との衝突はなし
        } else {
            puck.y = puck.radius + wallThickness;
            puck.speedY = -puck.speedY * restitution;
        }
    }
    // 下の壁との衝突（ゴールエリアを除く）
    if (puck.y + puck.radius > canvas.height - wallThickness) {
        if (
            puck.x + puck.radius > (canvas.width / 2 - goalWidth / 2) &&
            puck.x - puck.radius < (canvas.width / 2 + goalWidth / 2)
        ) {
            // ゴールエリアなので壁との衝突はなし
        } else {
            puck.y = canvas.height - puck.radius - wallThickness;
            puck.speedY = -puck.speedY * restitution;
        }
    }
}

// マレットと壁の衝突処理（マレットが非タッチ時のみ）
function handlePaddleWallCollision(paddle) {
    // マレットがタッチされていない場合のみ
    if (!paddle.isTouching) {
        // 左の壁との衝突
        if (paddle.x - paddle.radius < wallThickness) {
            paddle.x = paddle.radius + wallThickness;
            paddle.vx = -paddle.vx * restitution;
        }
        // 右の壁との衝突
        if (paddle.x + paddle.radius > canvas.width - wallThickness) {
            paddle.x = canvas.width - paddle.radius - wallThickness;
            paddle.vx = -paddle.vx * restitution;
        }
        // 上の壁との衝突
        if (paddle.y - paddle.radius < wallThickness) {
            paddle.y = paddle.radius + wallThickness;
            paddle.vy = -paddle.vy * restitution;
        }
        // 下の壁との衝突
        if (paddle.y + paddle.radius > canvas.height - wallThickness) {
            paddle.y = canvas.height - paddle.radius - wallThickness;
            paddle.vy = -paddle.vy * restitution;
        }
    }
}

// ゴール判定の改善（省略なし）
function handleGoal() {
    if (puck.y + puck.radius < 0) {
        // 上側のゴール（Player 1が得点）
        puck.speedX = 0;
        puck.speedY = 0;
        isGoal = true;
        displayGoalMessage();
        setTimeout(() => {
            scores[0]++;
            updateScore();
            resetGame(1);
            isGoal = false;
        }, 1000);
    } else if (puck.y - puck.radius > canvas.height) {
        // 下側のゴール（Player 2が得点）
        puck.speedX = 0;
        puck.speedY = 0;
        isGoal = true;
        displayGoalMessage();
        setTimeout(() => {
            scores[1]++;
            updateScore();
            resetGame(0);
            isGoal = false;
        }, 1000);
    }
}

// 衝突処理のメイン関数
function handleCollision() {
    // ゴール中は衝突判定を行わない
    if (isGoal) return;

    // 壁との衝突
    handleWallCollision();

    // マレットと壁の衝突
    paddles.forEach(paddle => {
        handlePaddleWallCollision(paddle);
    });

    // パックとマレットの衝突処理
    for (let paddle of paddles) {
        if (paddle.visible) {
            const dx = puck.x - paddle.x;
            const dy = puck.y - paddle.y;
            const distance = Math.hypot(dx, dy);
            const minDistance = puck.radius + paddle.radius;

            if (distance < minDistance) {
                // 弾性衝突の計算
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                // パックとマレットの速度を回転座標系に変換
                const v1 = rotate(puck.speedX, puck.speedY, sin, cos, true);
                const v2 = rotate(paddle.vx, paddle.vy, sin, cos, true);

                // 衝突後の速度計算
                const totalMass = puck.mass + paddle.mass;
                const diffMass = puck.mass - paddle.mass;

                const newV1x = (diffMass * v1.x + 2 * paddle.mass * v2.x) / totalMass;

                // 元の座標系に戻す
                const finalV1 = rotate(newV1x, v1.y, sin, cos, false);

                puck.speedX = finalV1.x * restitution;
                puck.speedY = finalV1.y * restitution;

                // パックがめり込まないように位置を調整
                const overlap = minDistance - distance;
                const correctionX = (overlap * (dx / distance)) / 2;
                const correctionY = (overlap * (dy / distance)) / 2;

                puck.x += correctionX;
                puck.y += correctionY;
                paddle.x -= correctionX;
                paddle.y -= correctionY;

                // マレットの位置を境界内に制限
                enforcePaddleBoundaries(paddle);
            }
        }
    }

    // マレット同士の衝突処理
    handlePaddleCollision();

    // ゴール判定
    handleGoal();
}

// マレット同士の衝突処理を関数化
function handlePaddleCollision() {
    const dx = paddles[0].x - paddles[1].x;
    const dy = paddles[0].y - paddles[1].y;
    const distance = Math.hypot(dx, dy);
    const minDistance = paddles[0].radius + paddles[1].radius;
    if (distance < minDistance) {
        const overlap = (minDistance - distance) / 2;
        const offsetX = (dx / distance) * overlap;
        const offsetY = (dy / distance) * overlap;

        paddles[0].x += offsetX;
        paddles[0].y += offsetY;
        paddles[1].x -= offsetX;
        paddles[1].y -= offsetY;

        // マレットの位置を境界内に制限
        enforcePaddleBoundaries(paddles[0]);
        enforcePaddleBoundaries(paddles[1]);

        // マレット同士の衝突後の速度を更新
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        const v1 = rotate(paddles[0].vx, paddles[0].vy, sin, cos, true);
        const v2 = rotate(paddles[1].vx, paddles[1].vy, sin, cos, true);

        const totalMass = paddles[0].mass + paddles[1].mass;
        const diffMass = paddles[0].mass - paddles[1].mass;

        const newV1x = (diffMass * v1.x + 2 * paddles[1].mass * v2.x) / totalMass;
        const newV2x = (2 * paddles[0].mass * v1.x - diffMass * v2.x) / totalMass;

        const finalV1 = rotate(newV1x, v1.y, sin, cos, false);
        const finalV2 = rotate(newV2x, v2.y, sin, cos, false);

        paddles[0].vx = finalV1.x;
        paddles[0].vy = finalV1.y;
        paddles[1].vx = finalV2.x;
        paddles[1].vy = finalV2.y;
    }
}

// ゴール時のメッセージ表示（省略なし）
function displayGoalMessage() {
    goalMessage.style.display = 'block';
    setTimeout(() => {
        goalMessage.style.display = 'none';
    }, 1000);
}

// スコアの更新（省略なし）
function updateScore() {
    if (scores[0] === 0 && scores[1] === 0) {
        scoreElement.textContent = '-- : --';
    } else {
        scoreElement.textContent = `${scores[0]} : ${scores[1]}`;
    }
    checkWin();
}

// 勝利条件のチェック（省略なし）
function checkWin() {
    if (scores[0] >= 10) {
        alert('Player 1 wins!');
        resetFullGame();
    } else if (scores[1] >= 10) {
        alert('Player 2 wins!');
        resetFullGame();
    }
}

// ゲームのリセット（省略なし）
function resetGame(scoredPlayer) {
    // ボールを中央にリセット
    puck.x = canvas.width / 2;
    puck.y = canvas.height / 2;
    // ボールの速度をリセット
    puck.speedX = 500 * (Math.random() > 0.5 ? 1 : -1) * scale;
    puck.speedY = 500 * (Math.random() > 0.5 ? 1 : -1) * scale;

    // ペナルティの適用
    if (penaltyGoalCheckbox.checked) {
        // 得点された側のゴールを広げる
        goalWidth *= 1.25;
    }
    if (penaltyPaddleCheckbox.checked && paddles[scoredPlayer]) {
        // 得点された側のラケットを小さくする
        paddles[scoredPlayer].radius *= 0.8;
        paddles[scoredPlayer].mass *= 0.8; // 質量も同割合で減少
    }

    // マレットの速度をリセット
    paddles.forEach(paddle => {
        paddle.vx = 0;
        paddle.vy = 0;
        // マレットの表示状態を更新
        if (!alwaysShowPaddleCheckbox.checked && !paddle.isTouching) {
            paddle.visible = false;
        } else {
            paddle.visible = true;
        }
    });
}

// ゲーム全体のリセット（省略なし）
function resetFullGame() {
    scores = [0, 0];
    updateScore();
    paddleRadius = basePaddleRadius;
    paddles.forEach(paddle => {
        paddle.radius = paddleRadius;
        paddle.mass = initialPaddleMass; // 質量を初期値に戻す
        paddle.vx = 0;
        paddle.vy = 0;
        if (!alwaysShowPaddleCheckbox.checked && !paddle.isTouching) {
            paddle.visible = false;
        } else {
            paddle.visible = true;
        }
    });
    // ゴールサイズをリセット
    goalWidth = paddleRadius * 2 * 1.5;
    resetGame(0);
}

// 速度の回転変換（省略なし）
function rotate(x, y, sin, cos, reverse) {
    return {
        x: reverse ? (x * cos + y * sin) : (x * cos - y * sin),
        y: reverse ? (y * cos - x * sin) : (y * cos + x * sin)
    };
}

// ボールの更新（省略なし）
function updatePuck(deltaTime) {
    puck.x += (puck.speedX * deltaTime) / 1000;
    puck.y += (puck.speedY * deltaTime) / 1000;

    // 摩擦（必要に応じて調整）
    const friction = 0.999;
    puck.speedX *= friction;
    puck.speedY *= friction;
}

// マレットの更新（省略なし）
function updatePaddles(deltaTime) {
    paddles.forEach(paddle => {
        if (paddle.isTouching) {
            // タッチ中は速度を計算
            paddle.vx = (paddle.x - paddle.prevX) / (deltaTime / 1000);
            paddle.vy = (paddle.y - paddle.prevY) / (deltaTime / 1000);

            // 前回の位置を更新
            paddle.prevX = paddle.x;
            paddle.prevY = paddle.y;

            // マレットの位置を境界内に制限
            enforcePaddleBoundaries(paddle);
        } else {
            // 摩擦を適用
            const friction = 0.95; // 調整可能な値
            paddle.vx *= friction;
            paddle.vy *= friction;

            // 速度に応じて位置を更新
            paddle.x += (paddle.vx * deltaTime) / 1000;
            paddle.y += (paddle.vy * deltaTime) / 1000;

            // マレットの位置を境界内に制限
            enforcePaddleBoundaries(paddle);
        }
    });
}

// 描画処理（省略なし）
function draw() {
    clearCanvas();

    // 左右の壁を描画
    ctx.fillStyle = '#FFFFFF'; // 白
    ctx.fillRect(0, 0, wallThickness, canvas.height); // 左壁
    ctx.fillRect(canvas.width - wallThickness, 0, wallThickness, canvas.height); // 右壁

    // 手前と奥の壁を描画
    // 上側の壁（奥）
    ctx.fillStyle = paddles[1].color;
    ctx.fillRect(wallThickness, 0, (canvas.width - goalWidth) / 2 - wallThickness, wallThickness * 2); // 左部分
    ctx.fillRect((canvas.width + goalWidth) / 2, 0, (canvas.width - goalWidth) / 2 - wallThickness, wallThickness * 2); // 右部分

    // 下側の壁（手前）
    ctx.fillStyle = paddles[0].color;
    ctx.fillRect(wallThickness, canvas.height - wallThickness * 2, (canvas.width - goalWidth) / 2 - wallThickness, wallThickness * 2); // 左部分
    ctx.fillRect((canvas.width + goalWidth) / 2, canvas.height - wallThickness * 2, (canvas.width - goalWidth) / 2 - wallThickness, wallThickness * 2); // 右部分

    // ボールの描画
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
    ctx.fillStyle = puckColor;
    ctx.fill();
    ctx.closePath();

    // ラケットの描画
    for (let paddle of paddles) {
        if (paddle.visible) {
            ctx.beginPath();
            ctx.arc(paddle.x, paddle.y, paddle.radius, 0, Math.PI * 2);
            ctx.fillStyle = paddle.color;
            ctx.fill();
            ctx.closePath();
        }
    }
}

// ゲームループ（省略なし）
let lastTime = performance.now();
function gameLoop(now = performance.now()) {
    const deltaTime = now - lastTime;
    lastTime = now;

    updatePaddles(deltaTime);
    updatePuck(deltaTime);
    handleCollision();
    draw();
    requestAnimationFrame(gameLoop);
}

// ゲーム開始時にリセット
resetGame(0);
gameLoop();

// ウィンドウのリサイズに対応（省略なし）
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // スケーリングの再計算
    scale = Math.min(canvas.width, canvas.height) / 800;
    // サイズの再設定
    wallThickness = 10 * scale;
    paddleRadius = basePaddleRadius;
    paddles.forEach(paddle => {
        paddle.radius = paddleRadius;
    });
    // パックのサイズを更新
    puck.radius = paddleRadius * 0.7;
    // ゴールサイズを更新
    goalWidth = paddleRadius * 2 * 1.5;
});

// 設定アイコンのクリックイベント（省略なし）
settingsIcon.addEventListener('click', () => {
    optionsMenu.style.display = 'block';
});

// オプション画面の閉じるボタン（省略なし）
closeOptionsButton.addEventListener('click', () => {
    optionsMenu.style.display = 'none';
});

// オプション変更時のイベントリスナー（省略なし）
alwaysShowPaddleCheckbox.addEventListener('change', () => {
    paddles.forEach(paddle => {
        if (alwaysShowPaddleCheckbox.checked) {
            paddle.visible = true;
        } else if (!paddle.isTouching) {
            paddle.visible = false;
        }
    });
});
