// キャンバスの取得と設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// キャンバスをデバイスの全画面に設定
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 跳ね返り係数（0〜1の範囲）
let restitution = 0.9;

// オプション設定の取得
const penaltyGoalCheckbox = document.getElementById('penaltyGoal');
const penaltyPaddleCheckbox = document.getElementById('penaltyPaddle');

// スコア表示の要素
const scoreElement = document.getElementById('score');

// スコアの初期化
let scores = [0, 0]; // [Player 1, Player 2]

// ゴールサイズの初期設定
const baseGoalWidth = 150; // 必要に応じて調整
let goalWidth = baseGoalWidth;

// ラケットとボールのサイズ（必要に応じて調整可能）
const basePaddleRadius = 50 * 2.5; // ラケットの半径を2.5倍に
let paddleRadius = basePaddleRadius;
const puckRadius = paddleRadius / 2; // ボールの半径

// ボールの初期設定
let puck = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: puckRadius,
    speedX: 500 * (Math.random() > 0.5 ? 1 : -1),
    speedY: 500 * (Math.random() > 0.5 ? 1 : -1),
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
        mass: 1,
        isTouching: false,
        touchId: null,
        visible: false,
        prevX: 0,
        prevY: 0,
        color: '#FF0000' // 赤
    },
    {
        x: canvas.width / 2,
        y: paddleRadius * 2,
        radius: paddleRadius,
        mass: 1,
        isTouching: false,
        touchId: null,
        visible: false,
        prevX: 0,
        prevY: 0,
        color: '#0000FF' // 青
    }
];

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

        // 画面の上下でプレイヤーを判別
        let paddle = touchY > canvas.height / 2 ? paddles[0] : paddles[1];

        if (!paddle.isTouching) {
            paddle.isTouching = true;
            paddle.touchId = touch.identifier;
            paddle.x = touchX;
            paddle.y = touchY;
            paddle.prevX = touchX;
            paddle.prevY = touchY;
            paddle.visible = true;
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        for (let paddle of paddles) {
            if (paddle.touchId === touch.identifier) {
                paddle.prevX = paddle.x;
                paddle.prevY = paddle.y;
                paddle.x = touch.clientX;
                paddle.y = touch.clientY;
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
                paddle.visible = false;
            }
        }
    }
}

// ボールとラケットの衝突処理
function handleCollision() {
    for (let paddle of paddles) {
        if (paddle.visible) {
            const dx = puck.x - paddle.x;
            const dy = puck.y - paddle.y;
            const distance = Math.hypot(dx, dy);
            const minDistance = puck.radius + paddle.radius;

            if (distance < minDistance) {
                // ラケットでボールを押さえる
                if (paddle.isTouching && distance < paddle.radius - puck.radius) {
                    puck.x = paddle.x;
                    puck.y = paddle.y;
                    puck.speedX = 0;
                    puck.speedY = 0;
                } else {
                    // 弾性衝突の計算
                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    // ボールの速度を回転座標系に変換
                    const v1 = rotate(puck.speedX, puck.speedY, sin, cos, true);
                    // ラケットの速度を計算
                    const paddleSpeedX = (paddle.x - paddle.prevX) * 60;
                    const paddleSpeedY = (paddle.y - paddle.prevY) * 60;
                    const v2 = rotate(paddleSpeedX, paddleSpeedY, sin, cos, true);

                    // 衝突後の速度
                    const vTotal = v1.x - v2.x;
                    v1.x = ((puck.mass - paddle.mass) * v1.x + 2 * paddle.mass * v2.x) / (puck.mass + paddle.mass);
                    v1.x += v2.x;

                    // 元の座標系に戻す
                    const finalVel = rotate(v1.x, v1.y, sin, cos, false);
                    puck.speedX = finalVel.x * restitution;
                    puck.speedY = finalVel.y * restitution;

                    // ボールがめり込まないように位置を調整
                    const overlap = minDistance - distance;
                    puck.x += (overlap * (dx / distance));
                    puck.y += (overlap * (dy / distance));
                }
            }
        }
    }

    // ラケット同士の重なりを防止
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
    }

    // 壁との衝突（左右の壁のみ）
    if (puck.x - puck.radius < 5) {
        puck.x = puck.radius + 5;
        puck.speedX = -puck.speedX * restitution;
    } else if (puck.x + puck.radius > canvas.width - 5) {
        puck.x = canvas.width - puck.radius - 5;
        puck.speedX = -puck.speedX * restitution;
    }

    // ゴールの判定（手前と奥）
    if (puck.y - puck.radius < 10) {
        // 上側のゴール（Player 1が得点）
        if (puck.x > (canvas.width / 2 - goalWidth / 2) && puck.x < (canvas.width / 2 + goalWidth / 2)) {
            // Player 1に得点
            scores[0]++;
            updateScore();
            resetGame(1);
        } else {
            // 壁に当たる場合
            puck.y = puck.radius + 10;
            puck.speedY = -puck.speedY * restitution;
        }
    } else if (puck.y + puck.radius > canvas.height - 10) {
        // 下側のゴール（Player 2が得点）
        if (puck.x > (canvas.width / 2 - goalWidth / 2) && puck.x < (canvas.width / 2 + goalWidth / 2)) {
            // Player 2に得点
            scores[1]++;
            updateScore();
            resetGame(0);
        } else {
            // 壁に当たる場合
            puck.y = canvas.height - puck.radius - 10;
            puck.speedY = -puck.speedY * restitution;
        }
    }
}

// スコアの更新
function updateScore() {
    scoreElement.textContent = `Player 1: ${scores[0]} | Player 2: ${scores[1]}`;
    checkWin();
}

// 勝利条件のチェック
function checkWin() {
    if (scores[0] >= 10) {
        alert('Player 1 wins!');
        resetFullGame();
    } else if (scores[1] >= 10) {
        alert('Player 2 wins!');
        resetFullGame();
    }
}

// ゲームのリセット
function resetGame(scoredPlayer) {
    // ボールを中央にリセット
    puck.x = canvas.width / 2;
    puck.y = canvas.height / 2;
    // ボールの速度をリセット
    puck.speedX = 500 * (Math.random() > 0.5 ? 1 : -1);
    puck.speedY = 500 * (Math.random() > 0.5 ? 1 : -1);

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
}

// ゲーム全体のリセット
function resetFullGame() {
    scores = [0, 0];
    updateScore();
    goalWidth = baseGoalWidth;
    paddleRadius = basePaddleRadius;
    paddles.forEach(paddle => {
        paddle.radius = paddleRadius;
        paddle.mass = 1;
    });
    resetGame(0);
}

// 速度の回転変換
function rotate(x, y, sin, cos, reverse) {
    return {
        x: reverse ? (x * cos + y * sin) : (x * cos - y * sin),
        y: reverse ? (y * cos - x * sin) : (y * cos + x * sin)
    };
}

// ボールの更新
function updatePuck(deltaTime) {
    puck.x += (puck.speedX * deltaTime) / 1000;
    puck.y += (puck.speedY * deltaTime) / 1000;

    // 摩擦（必要に応じて調整）
    const friction = 0.999;
    puck.speedX *= friction;
    puck.speedY *= friction;
}

// 描画処理
function draw() {
    clearCanvas();

    // 左右の壁を描画
    ctx.fillStyle = '#FFFFFF'; // 白
    ctx.fillRect(0, 0, 5, canvas.height); // 左壁
    ctx.fillRect(canvas.width - 5, 0, 5, canvas.height); // 右壁

    // 手前と奥の壁を描画
    // 上側の壁（奥）
    ctx.fillStyle = paddles[1].color;
    ctx.fillRect(5, 0, (canvas.width - goalWidth) / 2 - 5, 10); // 左部分
    ctx.fillRect((canvas.width + goalWidth) / 2, 0, (canvas.width - goalWidth) / 2 - 5, 10); // 右部分

    // 下側の壁（手前）
    ctx.fillStyle = paddles[0].color;
    ctx.fillRect(5, canvas.height - 10, (canvas.width - goalWidth) / 2 - 5, 10); // 左部分
    ctx.fillRect((canvas.width + goalWidth) / 2, canvas.height - 10, (canvas.width - goalWidth) / 2 - 5, 10); // 右部分

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

// ゲームループ
let lastTime = performance.now();
function gameLoop(now = performance.now()) {
    const deltaTime = now - lastTime;
    lastTime = now;

    updatePuck(deltaTime);
    handleCollision();
    draw();
    requestAnimationFrame(gameLoop);
}

// ゲーム開始時にリセット
resetGame(0);
gameLoop();

// ウィンドウのリサイズに対応
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // 必要に応じて、他の要素もリサイズ
});
