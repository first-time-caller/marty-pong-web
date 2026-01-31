# マーティ・シュプリーム風ポン（日本語コード版）
# 操作: 左パドル W/S、右パドル 上/下
# ルール: ボールがパドルに跳ね返るたびに速くなる（倍率）

import pygame
import sys

# 初期設定
pygame.init()
幅, 高さ = 900, 600
画面 = pygame.display.set_mode((幅, 高さ))
pygame.display.set_caption('マーティ・ポン')
時計 = pygame.time.Clock()

# 色（ポスター調）
黒 = (10, 10, 10)
白 = (245, 245, 240)
オレンジ = (245, 125, 25)  # 温かめのオレンジ
クリーム = (250, 240, 230)

# パドル設定（加速対応）
パドル幅, パドル高さ = 12, 100
左_x = 30
右_x = 幅 - 30 - パドル幅

# パドル基本設定（加速対応）
基本パドル速度 = 4.0
最大パドル速度 = 14.0
加速度 = 0.4
減速度 = 0.6

# 現在のパドル速度（毎フレーム変化する）
左速度現在 = 0.0
右速度現在 = 0.0

# ボール設定
ボール半径 = 10
初期速度 = 5.0
速度倍率 = 1.12  # パドルに当たるたびに掛ける
最大速度 = 25.0

# フォント選択（優先してバンドルされたフォントを使う。なければシステムフォントにフォールバック）
def 日本語フォント(size, bold=False):
    # プロジェクト内のフォントがあればそれを優先
    bundled = None
    try:
        bundled = pygame.font.Font('fonts/NotoSansJP-Bold.ttf', size) if bold else pygame.font.Font('fonts/NotoSansJP-Regular.ttf', size)
        return bundled
    except Exception:
        pass

    候補 = ['meiryo', 'yu gothic', 'ms gothic', 'msgothic', 'takao-gothic', 'ipag', 'arial unicode ms']
    for 名 in 候補:
        path = pygame.font.match_font(名)
        if path:
            try:
                return pygame.font.Font(path, size)
            except Exception:
                continue
    # フォールバック
    return pygame.font.SysFont(None, size)

フォント = 日本語フォント(22)
フォント太 = 日本語フォント(30, bold=True)
フォント大 = 日本語フォント(48, bold=True)

# 言語モード: 'both', 'jp', 'en'
言語モード = 'both'

# ゲーム状態
左_paddle_y = (高さ - パドル高さ) // 2
右_paddle_y = (高さ - パドル高さ) // 2

ボール_x = 幅 // 2
ボール_y = 高さ // 2
ボール_vx = 初期速度
ボール_vy = 初期速度 * 0.5

左スコア = 0
右スコア = 0

# ヘルパー関数（日本語名）

def 描画():
    画面.fill(黒)
    # 中央線
    for i in range(0, 高さ, 30):
        pygame.draw.rect(画面, 白, (幅//2 - 2, i + 5, 4, 20))
    # パドル
    pygame.draw.rect(画面, 白, (左_x, int(左_paddle_y), パドル幅, パドル高さ))
    pygame.draw.rect(画面, 白, (右_x, int(右_paddle_y), パドル幅, パドル高さ))
    # ボール（オレンジ）
    pygame.draw.circle(画面, オレンジ, (int(ボール_x), int(ボール_y)), ボール半径)
    # スコア
    左テキスト = フォント.render(str(左スコア), True, 白)
    右テキスト = フォント.render(str(右スコア), True, 白)
    画面.blit(左テキスト, (幅//4 - 左テキスト.get_width()//2, 20))
    画面.blit(右テキスト, (3*幅//4 - 右テキスト.get_width()//2, 20))
    # 操作説明
    説明 = フォント.render('W/S: 左  Up/Down: 右  P: 一時停止', True, 白)
    画面.blit(説明, (幅//2 - 説明.get_width()//2, 高さ - 40))
    pygame.display.flip()


def リセット(勝者=None):
    global ボール_x, ボール_y, ボール_vx, ボール_vy
    ボール_x = 幅 // 2
    ボール_y = 高さ // 2
    # サーブは負けた側から（勝者が None のときランダム）
    import random
    角度 = random.choice([-1, 1])
    ボール_vx = 初期速度 * 角度
    ボール_vy = 初期速度 * 0.5 * random.choice([-1, 1])


def 操作画面():
    """操作（説明）画面を表示してキー待ちする"""
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            if event.type == pygame.KEYDOWN:
                return True

        # 背景と大きなオレンジ球でポスター風に
        画面.fill(黒)
        pygame.draw.rect(画面, 白, (20, 20, 幅-40, 高さ-40), 2)
        # 大きな球
        pygame.draw.circle(画面, オレンジ, (幅//2, 180), 140)
        # テキスト
        タイトル = フォント大.render('操作説明 / CONTROLS', True, クリーム)
        行1 = フォント.render('W / S : 左パドル 上下  /  W/S : Left paddle', True, クリーム)
        行2 = フォント.render('↑ / ↓ : 右パドル 上下  /  Up/Down : Right paddle', True, クリーム)
        行3 = フォント.render('P : 一時停止 / P : Pause', True, クリーム)
        行4 = フォント.render('任意のキーで戻る / Press any key to return', True, クリーム)
        画面.blit(タイトル, (幅//2 - タイトル.get_width()//2, 80))
        画面.blit(行1, (幅//2 - 行1.get_width()//2, 320))
        画面.blit(行2, (幅//2 - 行2.get_width()//2, 360))
        画面.blit(行3, (幅//2 - 行3.get_width()//2, 400))
        画面.blit(行4, (幅//2 - 行4.get_width()//2, 440))
        pygame.display.flip()
        時計.tick(30)


def 一時停止メニュー():
    """一時停止メニューを表示して選択結果を返す
    戻り値: True=再開, False=終了
    """
    選択肢 = ['再開', '操作', '終了']
    選択 = 0
    global 言語モード
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_UP:
                    選択 = (選択 - 1) % len(選択肢)
                elif event.key == pygame.K_DOWN:
                    選択 = (選択 + 1) % len(選択肢)
                elif event.key == pygame.K_RETURN or event.key == pygame.K_KP_ENTER:
                    選んだ = 選択肢[選択]
                    if 選んだ == '再開':
                        return True
                    if 選んだ == '操作':
                        ok = 操作画面()
                        if not ok:
                            return False
                    if 選んだ == '終了':
                        return False
                elif event.key == pygame.K_p or event.key == pygame.K_ESCAPE:
                    return True
                elif event.key == pygame.K_l:
                    if 言語モード == 'both':
                        言語モード = 'en'
                    elif 言語モード == 'en':
                        言語モード = 'jp'
                    else:
                        言語モード = 'both'

        画面.fill(黒)
        pygame.draw.rect(画面, クリーム, (16, 16, 幅-32, 高さ-32), 4)
        pygame.draw.circle(画面, オレンジ, (幅//2, 170), 130)

        タイトル = フォント大.render('PAUSED', True, 黒)
        サブ = フォント太.render('一時停止', True, クリーム)
        画面.blit(タイトル, (幅//2 - タイトル.get_width()//2, 140))
        画面.blit(サブ, (幅//2 - サブ.get_width()//2, 210))

        for i, 項目 in enumerate(選択肢):
            色 = クリーム
            if i == 選択:
                色 = オレンジ
            en = ''
            if 項目 == '再開':
                en = 'Resume'
            elif 項目 == '操作':
                en = 'Controls'
            elif 項目 == '終了':
                en = 'Quit'

            if 言語モード == 'both':
                テキスト = フォント太.render(f'{項目}  /  {en}', True, 色)
            elif 言語モード == 'jp':
                テキスト = フォント太.render(項目, True, 色)
            else:
                テキスト = フォント太.render(en, True, 色)

            画面.blit(テキスト, (幅//2 - テキスト.get_width()//2, 320 + i * 56))

        補助 = フォント.render('P/Esc: 再開  L: 言語切替', True, クリーム)
        画面.blit(補助, (幅//2 - 補助.get_width()//2, 高さ - 56))

        pygame.display.flip()
        時計.tick(30)


def スタートメニュー():
    """日本語のスタートメニューを表示し、選択結果を返す
    戻り値: True=ゲーム開始, False=終了
    """
    選択肢 = ['ゲーム開始', '操作', '終了']
    選択 = 0
    global 言語モード
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_UP:
                    選択 = (選択 - 1) % len(選択肢)
                elif event.key == pygame.K_DOWN:
                    選択 = (選択 + 1) % len(選択肢)
                elif event.key == pygame.K_RETURN or event.key == pygame.K_KP_ENTER:
                    選んだ = 選択肢[選択]
                    if 選んだ == 'ゲーム開始':
                        return True
                    if 選んだ == '操作':
                        ok = 操作画面()
                        if not ok:
                            return False
                    if 選んだ == '終了':
                        return False
                elif event.key == pygame.K_l:
                    # toggle language mode
                    if 言語モード == 'both':
                        言語モード = 'en'
                    elif 言語モード == 'en':
                        言語モード = 'jp'
                    else:
                        言語モード = 'both'

        # 描画（ポスター風）
        画面.fill(黒)
        # 白枠
        pygame.draw.rect(画面, クリーム, (16, 16, 幅-32, 高さ-32), 4)
        # 大きな球を上部に配置
        球中心_y = 160
        pygame.draw.circle(画面, オレンジ, (幅//2, 球中心_y), 150)

        # タイトル（サイズ調整）
        タイトル = フォント大.render('Marty Pong', True, 黒)
        サブ = フォント太.render('マーティ・ポン', True, クリーム)
        # タイトルを球の中央付近に表示（調整して切れないように）
        画面.blit(タイトル, (幅//2 - タイトル.get_width()//2, 球中心_y - 30))
        画面.blit(サブ, (幅//2 - サブ.get_width()//2, 球中心_y + 10))

        # メニュー項目（バイリンガル）
        for i, 項目 in enumerate(選択肢):
            色 = クリーム
            if i == 選択:
                色 = オレンジ
            en = ''
            if 項目 == 'ゲーム開始':
                en = 'Start Game'
            elif 項目 == '操作':
                en = 'Controls'
            elif 項目 == '終了':
                en = 'Quit'

            if 言語モード == 'both':
                テキスト = フォント太.render(f'{項目}  /  {en}', True, 色)
            elif 言語モード == 'jp':
                テキスト = フォント太.render(項目, True, 色)
            else:
                テキスト = フォント太.render(en, True, 色)

            画面.blit(テキスト, (幅//2 - テキスト.get_width()//2, 340 + i * 56))

        補助 = フォント.render('L: 言語切替 / L: Toggle language', True, クリーム)
        画面.blit(補助, (幅//2 - 補助.get_width()//2, 高さ - 56))

        # 小さな装飾円を左右に
        pygame.draw.circle(画面, オレンジ, (幅//2 - 260, 球中心_y + 140), 20)
        pygame.draw.circle(画面, オレンジ, (幅//2 + 260, 球中心_y + 140), 20)

        # かすかなグレイン（ドット）
        for x in range(0, 幅, 60):
            for y in range(0, 高さ, 60):
                pygame.draw.circle(画面, (20, 20, 20), (x+30, y+30), 1)

        pygame.display.flip()
        時計.tick(30)


def 主ループ():
    global 左_paddle_y, 右_paddle_y, ボール_x, ボール_y, ボール_vx, ボール_vy, 左スコア, 右スコア, 左速度現在, 右速度現在, 言語モード
    実行中 = True
    while 実行中:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                実行中 = False
                break
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    実行中 = False
                    break
                if event.key == pygame.K_p:
                    ok = 一時停止メニュー()
                    if not ok:
                        実行中 = False
                        break
                if event.key == pygame.K_l:
                    # toggle language mode in-game as well
                    global 言語モード
                    if 言語モード == 'both':
                        言語モード = 'en'
                    elif 言語モード == 'en':
                        言語モード = 'jp'
                    else:
                        言語モード = 'both'

        keys = pygame.key.get_pressed()
        # パドル移動（加速・段階的に応答）
        # 左パドル
        target_left = 0
        if keys[pygame.K_w]:
            target_left = -1
        elif keys[pygame.K_s]:
            target_left = 1

        if target_left != 0:
            左速度現在 += 加速度 * target_left
            if 左速度現在 > 最大パドル速度:
                左速度現在 = 最大パドル速度
            if 左速度現在 < -最大パドル速度:
                左速度現在 = -最大パドル速度
        else:
            # 減速して停止へ
            if 左速度現在 > 0:
                左速度現在 = max(0.0, 左速度現在 - 減速度)
            elif 左速度現在 < 0:
                左速度現在 = min(0.0, 左速度現在 + 減速度)

        左_paddle_y += 左速度現在

        # 右パドル
        target_right = 0
        if keys[pygame.K_UP]:
            target_right = -1
        elif keys[pygame.K_DOWN]:
            target_right = 1

        if target_right != 0:
            右速度現在 += 加速度 * target_right
            if 右速度現在 > 最大パドル速度:
                右速度現在 = 最大パドル速度
            if 右速度現在 < -最大パドル速度:
                右速度現在 = -最大パドル速度
        else:
            if 右速度現在 > 0:
                右速度現在 = max(0.0, 右速度現在 - 減速度)
            elif 右速度現在 < 0:
                右速度現在 = min(0.0, 右速度現在 + 減速度)

        右_paddle_y += 右速度現在

        # パドル領域制限
        左_paddle_y = max(0, min(高さ - パドル高さ, 左_paddle_y))
        右_paddle_y = max(0, min(高さ - パドル高さ, 右_paddle_y))

        # ボール移動
        ボール_x += ボール_vx
        ボール_y += ボール_vy

        # 上下壁で反射
        if ボール_y - ボール半径 <= 0:
            ボール_y = ボール半径
            ボール_vy *= -1
        if ボール_y + ボール半径 >= 高さ:
            ボール_y = 高さ - ボール半径
            ボール_vy *= -1

        # 左パドル衝突
        if (左_x <= ボール_x - ボール半径 <= 左_x + パドル幅) and (左_paddle_y <= ボール_y <= 左_paddle_y + パドル高さ):
            ボール_x = 左_x + パドル幅 + ボール半径
            ボール_vx = abs(ボール_vx) * 速度倍率
            # 角度にばらつきを加える（パドルのヒット位置で変化）
            中心差 = (ボール_y - (左_paddle_y + パドル高さ/2)) / (パドル高さ/2)
            ボール_vy += 中心差 * 2
            # 速度上限
            if abs(ボール_vx) > 最大速度:
                ボール_vx = 最大速度 if ボール_vx > 0 else -最大速度

        # 右パドル衝突
        if (右_x <= ボール_x + ボール半径 <= 右_x + パドル幅) and (右_paddle_y <= ボール_y <= 右_paddle_y + パドル高さ):
            ボール_x = 右_x - ボール半径
            ボール_vx = -abs(ボール_vx) * 速度倍率
            中心差 = (ボール_y - (右_paddle_y + パドル高さ/2)) / (パドル高さ/2)
            ボール_vy += 中心差 * 2
            if abs(ボール_vx) > 最大速度:
                ボール_vx = 最大速度 if ボール_vx > 0 else -最大速度

        # ゴール判定
        if ボール_x < 0:
            右スコア += 1
            リセット(勝者='右')
            pygame.time.delay(500)
        if ボール_x > 幅:
            左スコア += 1
            リセット(勝者='左')
            pygame.time.delay(500)

        # in-game vignette / poster accent: draw subtle orange radial overlay at center
        描画()
        # draw vignette (concentric translucent circles)
        for r, a in [(220, 15), (260, 8), (300, 4)]:
            s = pygame.Surface((幅, 高さ), pygame.SRCALPHA)
            pygame.draw.circle(s, (245,125,25,a), (幅//2, 高さ//2), r)
            画面.blit(s, (0,0), special_flags=pygame.BLEND_RGBA_ADD)
        時計.tick(60)

    pygame.quit()
    sys.exit()


if __name__ == '__main__':
    # スタートメニューを表示してからゲームを開始
    try:
        メニュー結果 = スタートメニュー()
        if メニュー結果:
            リセット()
            主ループ()
        else:
            pygame.quit()
            sys.exit()
    except Exception as e:
        # 出力にトレースバックを表示してデバッグしやすくする
        import traceback
        traceback.print_exc()
        pygame.quit()
        sys.exit(1)
