// Generates Google Play phone screenshots (1080x1920) for Geko.
// Usage: swift scripts/generate_storelisting.swift
import AppKit
import Foundation

let W: CGFloat = 1080
let H: CGFloat = 1920
let uploads = "/Users/wilbertgamis/.gemini/antigravity/brain/b7e0fba1-f681-48f7-a0b1-54ca6585f1f5/.user_uploaded"
let iconPath = "storelisting/app-icon-512x512.png"

struct Shot {
    let src: String
    let out: String
    let badge: String
    let line1: String
    let line2: String
    let sub: String
    let patchChat: Bool
}

let shots: [Shot] = [
    Shot(src: "media_1795441572043_50e68063.jpg", out: "phone-1-home-3d-wallet.png",
         badge: "3D SMART WALLET", line1: "Your Money & Cards", line2: "In One Place",
         sub: "Track balances, daily spending & budgets across all your Philippine accounts.", patchChat: false),
    Shot(src: "media_1795441575113_e69d43cf.jpg", out: "phone-2-chat-geko-ai.png",
         badge: "CHAT GEKO AI", line1: "Just Chat to", line2: "Log Expenses",
         sub: "Type in English or Taglish. Geko records it and updates your card balance instantly.", patchChat: true),
    Shot(src: "media_1795441577038_910a108c.jpg", out: "phone-3-expense-calendar.png",
         badge: "CASHFLOW CALENDAR", line1: "See Every Peso", line2: "Day by Day",
         sub: "Spending, inflow & net savings on a clean visual monthly calendar.", patchChat: false),
    Shot(src: "media_1795441573201_e6bbf722.jpg", out: "phone-4-philippine-cards.png",
         badge: "100+ PH BANKS & E-WALLETS", line1: "All Your Cards", line2: "Beautifully in 3D",
         sub: "GCash, Maya, GoTyme, BPI, BDO, Beep & more, with custom card colors.", patchChat: false),
    Shot(src: "media_1795441578337_53e7dd3d.jpg", out: "phone-5-savings-goals.png",
         badge: "SAVINGS & PAYDAY PLANNER", line1: "Hit Your Goals", line2: "Every Cutoff",
         sub: "Plan around your 15th & 30th paydays and track savings targets with ease.", patchChat: false),
]

func hex(_ v: UInt32, _ a: CGFloat = 1) -> NSColor {
    NSColor(deviceRed: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255,
            blue: CGFloat(v & 0xFF) / 255, alpha: a)
}

func loadImage(_ path: String) -> (NSImage, NSBitmapImageRep) {
    let rep = NSBitmapImageRep(data: try! Data(contentsOf: URL(fileURLWithPath: path)))!
    let img = NSImage(size: NSSize(width: rep.pixelsWide, height: rep.pixelsHigh))
    img.addRepresentation(rep)
    return (img, rep)
}

/// Creates a bitmap and runs `draw` in a flipped (top-left origin) graphics context.
func render(width: Int, height: Int, _ draw: () -> Void) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
                               bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let base = NSGraphicsContext(bitmapImageRep: rep)!
    let cg = base.cgContext
    cg.translateBy(x: 0, y: CGFloat(height))
    cg.scaleBy(x: 1, y: -1)
    let flipped = NSGraphicsContext(cgContext: cg, flipped: true)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = flipped
    flipped.imageInterpolation = .high
    draw()
    NSGraphicsContext.restoreGraphicsState()
    return rep
}

/// Removes the floating mascot peeking over the chat card (left edge) and restores the card.
func patchChat(_ img: NSImage) -> NSImage {
    let (home, _) = loadImage("\(uploads)/media_1795441572043_50e68063.jpg")
    let rep = render(width: 458, height: 1024) {
        img.draw(in: NSRect(x: 0, y: 0, width: 458, height: 1024), from: .zero,
                 operation: .copy, fraction: 1, respectFlipped: true, hints: nil)
        hex(0xF9FAFB).setFill(); NSRect(x: 0, y: 420, width: 26, height: 110).fill()
        hex(0xF3F6FA).setFill(); NSRect(x: 26, y: 420, width: 28, height: 108).fill()
        // Same GoTyme card from the Home screen, scaled into the chat card slot.
        NSGraphicsContext.saveGraphicsState()
        let slot = NSRect(x: 53, y: 378, width: 210, height: 133)
        NSBezierPath(roundedRect: slot, xRadius: 10, yRadius: 10).addClip()
        let from = NSRect(x: 16, y: 1024 - 324 - 269, width: 427, height: 269)
        home.draw(in: slot, from: from, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: nil)
        NSGraphicsContext.restoreGraphicsState()
    }
    let out = NSImage(size: NSSize(width: 458, height: 1024))
    out.addRepresentation(rep)
    return out
}

func drawText(_ s: String, at p: NSPoint, size: CGFloat, weight: NSFont.Weight, color: NSColor, kern: CGFloat = 0) {
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: size, weight: weight),
                                                .foregroundColor: color, .kern: kern]
    NSAttributedString(string: s, attributes: attrs).draw(at: p)
}

func textWidth(_ s: String, size: CGFloat, weight: NSFont.Weight, kern: CGFloat = 0) -> CGFloat {
    NSAttributedString(string: s, attributes: [.font: NSFont.systemFont(ofSize: size, weight: weight), .kern: kern]).size().width
}

func drawStatusBar(in r: NSRect, scale s: CGFloat) {
    let ink = hex(0x111827)
    // Time
    let tAttrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 15 * s, weight: .semibold), .foregroundColor: ink]
    let t = NSAttributedString(string: "9:41", attributes: tAttrs)
    t.draw(at: NSPoint(x: r.minX + 26 * s, y: r.midY - t.size().height / 2))

    ink.setFill(); ink.setStroke()
    var x = r.maxX - 26 * s
    // Battery
    let bw = 22 * s, bh = 11 * s
    let body = NSRect(x: x - bw, y: r.midY - bh / 2, width: bw, height: bh)
    let bp = NSBezierPath(roundedRect: body, xRadius: 3 * s, yRadius: 3 * s); bp.lineWidth = 1.2 * s; bp.stroke()
    NSBezierPath(roundedRect: body.insetBy(dx: 2 * s, dy: 2 * s), xRadius: 1.5 * s, yRadius: 1.5 * s).fill()
    NSBezierPath(roundedRect: NSRect(x: body.maxX + 1 * s, y: r.midY - 2.5 * s, width: 1.6 * s, height: 5 * s),
                 xRadius: 0.8 * s, yRadius: 0.8 * s).fill()
    x = body.minX - 8 * s
    // Wi-Fi (three arcs + dot), centred on its base point
    let cx = x - 8 * s, base = r.midY + 5.5 * s
    for (i, rad) in [4.0, 8.0, 12.0].enumerated() {
        let p = NSBezierPath()
        p.appendArc(withCenter: NSPoint(x: cx, y: base), radius: CGFloat(rad) * s, startAngle: 225, endAngle: 315, clockwise: false)
        p.lineWidth = 2 * s; p.lineCapStyle = .round
        if i == 0 { NSBezierPath(ovalIn: NSRect(x: cx - 1.6 * s, y: base - 3.2 * s, width: 3.2 * s, height: 3.2 * s)).fill() }
        p.stroke()
    }
    x = cx - 14 * s
    // Signal bars
    for i in 0..<4 {
        let bhI = (4 + CGFloat(i) * 2.6) * s
        let bx = x - CGFloat(3 - i) * 4.5 * s - 3 * s
        NSBezierPath(roundedRect: NSRect(x: bx, y: r.midY + 5.5 * s - bhI, width: 3 * s, height: bhI),
                     xRadius: 1 * s, yRadius: 1 * s).fill()
    }
}

func pixelColor(_ rep: NSBitmapImageRep, _ x: Int, _ y: Int) -> NSColor {
    rep.colorAt(x: x, y: y)!.usingColorSpace(.deviceRGB)!
}

let (icon, _) = loadImage(iconPath)

for shot in shots {
    var (shotImg, shotRep) = loadImage("\(uploads)/\(shot.src)")
    if shot.patchChat { shotImg = patchChat(shotImg) }
    let topBg = pixelColor(shotRep, 8, 54)
    let navBg = pixelColor(shotRep, 8, 998)

    let rep = render(width: Int(W), height: Int(H)) {
        // ── Background ──
        NSGradient(colors: [hex(0x12925D), hex(0x0A6B43), hex(0x043A24)], atLocations: [0, 0.5, 1], colorSpace: .deviceRGB)!
            .draw(from: NSPoint(x: 0, y: 0), to: NSPoint(x: W * 0.3, y: H), options: [.drawsBeforeStartingLocation, .drawsAfterEndingLocation])
        let glow = NSGradient(starting: hex(0x5FF0A8, 0.28), ending: hex(0x5FF0A8, 0))!
        glow.draw(fromCenter: NSPoint(x: 960, y: 260), radius: 0, toCenter: NSPoint(x: 960, y: 260), radius: 620, options: [])
        let glow2 = NSGradient(starting: hex(0x2DD4BF, 0.16), ending: hex(0x2DD4BF, 0))!
        glow2.draw(fromCenter: NSPoint(x: 80, y: 1500), radius: 0, toCenter: NSPoint(x: 80, y: 1500), radius: 700, options: [])

        // ── Header ──
        let iconRect = NSRect(x: 80, y: 92, width: 76, height: 76)
        NSGraphicsContext.saveGraphicsState()
        let ish = NSShadow(); ish.shadowColor = hex(0x000000, 0.25); ish.shadowBlurRadius = 16; ish.shadowOffset = NSSize(width: 0, height: -6); ish.set()
        hex(0xFFFFFF).setFill(); NSBezierPath(roundedRect: iconRect, xRadius: 20, yRadius: 20).fill()
        NSGraphicsContext.restoreGraphicsState()
        NSGraphicsContext.saveGraphicsState()
        NSBezierPath(roundedRect: iconRect, xRadius: 20, yRadius: 20).addClip()
        icon.draw(in: iconRect, from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: nil)
        NSGraphicsContext.restoreGraphicsState()

        drawText("Geko", at: NSPoint(x: 176, y: 92), size: 30, weight: .heavy, color: .white)
        let bw = textWidth(shot.badge, size: 17, weight: .bold, kern: 1.6) + 32
        let badge = NSRect(x: 176, y: 134, width: bw, height: 34)
        hex(0xFFFFFF, 0.14).setFill(); NSBezierPath(roundedRect: badge, xRadius: 17, yRadius: 17).fill()
        hex(0x8CF5C2).setFill(); NSBezierPath(ovalIn: NSRect(x: badge.minX + 14, y: badge.midY - 4, width: 8, height: 8)).fill()
        drawText(shot.badge, at: NSPoint(x: badge.minX + 28, y: badge.minY + 7), size: 17, weight: .bold, color: hex(0xD1FAE5), kern: 1.6)

        drawText(shot.line1, at: NSPoint(x: 76, y: 200), size: 78, weight: .heavy, color: .white, kern: -1.5)
        drawText(shot.line2, at: NSPoint(x: 76, y: 288), size: 78, weight: .heavy, color: hex(0x7CF5B8), kern: -1.5)

        let para = NSMutableParagraphStyle(); para.lineSpacing = 6
        NSAttributedString(string: shot.sub, attributes: [
            .font: NSFont.systemFont(ofSize: 30, weight: .medium),
            .foregroundColor: hex(0xFFFFFF, 0.82), .paragraphStyle: para,
        ]).draw(in: NSRect(x: 80, y: 402, width: 900, height: 90))

        // ── Phone ──
        let screenW: CGFloat = 600
        let s = screenW / 458
        let screenH = 1024 * s
        let bezel: CGFloat = 15
        let body = NSRect(x: (W - screenW) / 2 - bezel, y: 522, width: screenW + bezel * 2, height: screenH + bezel * 2)
        let screen = body.insetBy(dx: bezel, dy: bezel)

        // Side buttons (right: volume + power)
        hex(0x2A2E35).setFill()
        NSBezierPath(roundedRect: NSRect(x: body.maxX - 3, y: body.minY + 250, width: 9, height: 120), xRadius: 3, yRadius: 3).fill()
        NSBezierPath(roundedRect: NSRect(x: body.maxX - 3, y: body.minY + 400, width: 9, height: 80), xRadius: 3, yRadius: 3).fill()

        // Body with drop shadow
        let bodyPath = NSBezierPath(roundedRect: body, xRadius: 80, yRadius: 80)
        NSGraphicsContext.saveGraphicsState()
        let sh = NSShadow(); sh.shadowColor = hex(0x000000, 0.45); sh.shadowBlurRadius = 60; sh.shadowOffset = NSSize(width: 0, height: -30); sh.set()
        hex(0x0B0D10).setFill(); bodyPath.fill()
        NSGraphicsContext.restoreGraphicsState()
        // Metallic frame
        NSGradient(colors: [hex(0x5B616B), hex(0x23272D), hex(0x3B4048), hex(0x16191D)], atLocations: [0, 0.35, 0.7, 1], colorSpace: .deviceRGB)!
            .draw(in: bodyPath, angle: -60)
        hex(0x0A0B0D).setFill()
        NSBezierPath(roundedRect: body.insetBy(dx: 5, dy: 5), xRadius: 75, yRadius: 75).fill()
        hex(0xFFFFFF, 0.18).setStroke()
        let rim = NSBezierPath(roundedRect: body.insetBy(dx: 1, dy: 1), xRadius: 79, yRadius: 79); rim.lineWidth = 1.5; rim.stroke()

        // Screen
        NSGraphicsContext.saveGraphicsState()
        NSBezierPath(roundedRect: screen, xRadius: 66, yRadius: 66).addClip()
        shotImg.draw(in: screen, from: .zero, operation: .copy, fraction: 1, respectFlipped: true, hints: nil)
        // Clean status bar
        let sb = NSRect(x: screen.minX, y: screen.minY, width: screen.width, height: 48 * s)
        topBg.setFill(); sb.fill()
        drawStatusBar(in: sb.offsetBy(dx: 0, dy: 3), scale: s)
        // Clean gesture area with home indicator
        let nav = NSRect(x: screen.minX, y: screen.minY + 1003 * s, width: screen.width, height: 21 * s)
        navBg.setFill(); nav.fill()
        hex(0x111827, 0.85).setFill()
        NSBezierPath(roundedRect: NSRect(x: screen.midX - 64, y: nav.midY - 3, width: 128, height: 6), xRadius: 3, yRadius: 3).fill()
        // Subtle glass reflection
        NSGradient(starting: hex(0xFFFFFF, 0.07), ending: hex(0xFFFFFF, 0))!
            .draw(from: NSPoint(x: screen.minX, y: screen.minY), to: NSPoint(x: screen.midX, y: screen.midY), options: [])
        NSGraphicsContext.restoreGraphicsState()

        // Punch-hole camera
        let cam = NSRect(x: screen.midX - 13, y: sb.midY - 13 + 3, width: 26, height: 26)
        hex(0x050506).setFill(); NSBezierPath(ovalIn: cam).fill()
        hex(0x1E293B).setFill(); NSBezierPath(ovalIn: cam.insetBy(dx: 7, dy: 7)).fill()
        hex(0x60A5FA, 0.5).setFill(); NSBezierPath(ovalIn: NSRect(x: cam.minX + 9, y: cam.minY + 8, width: 4, height: 4)).fill()
    }

    let png = rep.representation(using: .png, properties: [:])!
    try! png.write(to: URL(fileURLWithPath: "storelisting/\(shot.out)"))
    print("✓ storelisting/\(shot.out)")
}
