import AppKit
import Foundation

// Configuration
let targetWidth = 1080
let targetHeight = 1920

let innerScreenX: CGFloat = 132
let innerScreenY_unflipped: CGFloat = 92 // (1920 - 1828)
let innerScreenWidth: CGFloat = 816
let innerScreenHeight: CGFloat = 1266
let innerCornerRadius: CGFloat = 32

let cropTopY = 48
let cropBottomY = 1001 // height = 953

let brainDir = "/Users/wilbertgamis/.gemini/antigravity/brain/b7e0fba1-f681-48f7-a0b1-54ca6585f1f5/.user_uploaded"

struct ShowcaseItem {
    let templateFile: String
    let userImageFile: String
    let outputFiles: [String]
    let isPhone5: Bool
    let cleanMascot: Bool
}

let items: [ShowcaseItem] = [
    ShowcaseItem(
        templateFile: "storelisting/phone-1-home-3d-wallet.png",
        userImageFile: "\(brainDir)/media_1795437857506_d8c90698.jpg",
        outputFiles: ["storelisting/phone-1-home-3d-wallet.png"],
        isPhone5: false,
        cleanMascot: false
    ),
    ShowcaseItem(
        templateFile: "storelisting/phone-2-chat-geko-ai.png",
        userImageFile: "\(brainDir)/media_1795437862960_744f8490.jpg",
        outputFiles: ["storelisting/phone-2-chat-geko-ai.png"],
        isPhone5: false,
        cleanMascot: true
    ),
    ShowcaseItem(
        templateFile: "storelisting/phone-3-expense-calendar.png",
        userImageFile: "\(brainDir)/media_1795437864461_917512d4.jpg",
        outputFiles: ["storelisting/phone-3-expense-calendar.png"],
        isPhone5: false,
        cleanMascot: false
    ),
    ShowcaseItem(
        templateFile: "storelisting/phone-4-philippine-cards.png",
        userImageFile: "\(brainDir)/media_1795437860250_9acd63e3.jpg",
        outputFiles: ["storelisting/phone-4-philippine-cards.png"],
        isPhone5: false,
        cleanMascot: false
    ),
    ShowcaseItem(
        templateFile: "storelisting/phone-5-receipt-scanner.png",
        userImageFile: "\(brainDir)/media_1795437866515_fb3579f7.jpg",
        outputFiles: [
            "storelisting/phone-5-receipt-scanner.png",
            "storelisting/phone-5-savings-goals.png"
        ],
        isPhone5: true,
        cleanMascot: false
    )
]

func cleanAndCropUserImage(path: String, cleanMascot: Bool) -> CGImage? {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: path)),
          let rep = NSBitmapImageRep(data: data),
          let fullCg = rep.cgImage else {
        print("Failed to load \(path)")
        return nil
    }

    let srcW = rep.pixelsWide // 458
    let cropH = cropBottomY - cropTopY // 953

    // Crop top status bar (y: 0..47) and bottom gesture bar (y > 1001)
    let cropRect = CGRect(x: 0, y: cropTopY, width: srcW, height: cropH)
    guard let cropped = fullCg.cropping(to: cropRect) else { return nil }

    if !cleanMascot {
        return cropped
    }

    // Special clean for mascot on right edge if needed
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(
        data: nil,
        width: srcW,
        height: cropH,
        bitsPerComponent: 8,
        bytesPerRow: srcW * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return cropped }

    ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: srcW, height: cropH))

    // In unflipped CGContext coords for 458x953:
    // Mascot was at y from top: 492 .. 602
    // In unflipped: y = 953 - 602 = 351, height = 110
    ctx.setFillColor(red: 0.9725, green: 0.9765, blue: 0.9843, alpha: 1.0)
    ctx.fill(CGRect(x: 388, y: 351, width: 70, height: 110))

    return ctx.makeImage()
}

func renderShowcase(item: ShowcaseItem) {
    guard let tmplData = try? Data(contentsOf: URL(fileURLWithPath: item.templateFile)),
          let tmplRep = NSBitmapImageRep(data: tmplData),
          let tmplCg = tmplRep.cgImage else {
        print("Error loading template \(item.templateFile)")
        return
    }

    guard let cleanedUserCg = cleanAndCropUserImage(path: item.userImageFile, cleanMascot: item.cleanMascot) else {
        print("Error cleaning user image \(item.userImageFile)")
        return
    }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(
        data: nil,
        width: targetWidth,
        height: targetHeight,
        bitsPerComponent: 8,
        bytesPerRow: targetWidth * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        print("Error creating context")
        return
    }

    // 1. Draw base template right-side up
    ctx.draw(tmplCg, in: CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))

    // 2. If phone 5, update header text and gradient
    if item.isPhone5 {
        // Redraw top gradient to clear old text
        let gradColors = [
            NSColor(calibratedRed: 0.0863, green: 0.6157, blue: 0.4118, alpha: 1.0).cgColor,
            NSColor(calibratedRed: 0.0706, green: 0.5216, blue: 0.3529, alpha: 1.0).cgColor
        ] as CFArray
        if let grad = CGGradient(colorsSpace: colorSpace, colors: gradColors, locations: [0.0, 1.0]) {
            ctx.saveGState()
            ctx.clip(to: CGRect(x: 50, y: 1400, width: 980, height: 430))
            ctx.drawLinearGradient(grad, start: CGPoint(x: 540, y: 1830), end: CGPoint(x: 540, y: 1400), options: [])
            ctx.restoreGState()
        }

        // Draw pill badge
        let pillRect = CGRect(x: 95, y: 1742, width: 410, height: 50)
        let pillPath = CGPath(roundedRect: pillRect, cornerWidth: 25, cornerHeight: 25, transform: nil)
        ctx.saveGState()
        ctx.setFillColor(red: 0.22, green: 0.67, blue: 0.50, alpha: 1.0)
        ctx.addPath(pillPath)
        ctx.fillPath()

        // Pill icon
        ctx.setStrokeColor(red: 0.31, green: 0.88, blue: 0.58, alpha: 1.0)
        ctx.setLineWidth(3.0)
        ctx.strokeEllipse(in: CGRect(x: 116, y: 1755, width: 24, height: 24))
        ctx.setFillColor(red: 0.31, green: 0.88, blue: 0.58, alpha: 1.0)
        ctx.fillEllipse(in: CGRect(x: 124, y: 1763, width: 8, height: 8))
        ctx.restoreGState()

        // Pill text
        let pAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 20, weight: .bold),
            .foregroundColor: NSColor.white,
            .kern: 1.2
        ]
        let pLine = CTLineCreateWithAttributedString(NSAttributedString(string: "SAVINGS & SALARY PLANNER", attributes: pAttrs))
        ctx.textPosition = CGPoint(x: 156, y: 1758)
        CTLineDraw(pLine, ctx)

        // Title Line 1
        let t1Attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 66, weight: .bold),
            .foregroundColor: NSColor.white,
            .kern: -0.5
        ]
        let t1Line = CTLineCreateWithAttributedString(NSAttributedString(string: "Smart Savings Goals", attributes: t1Attrs))
        ctx.textPosition = CGPoint(x: 82, y: 1650)
        CTLineDraw(t1Line, ctx)

        // Title Line 2
        let t2Attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 66, weight: .bold),
            .foregroundColor: NSColor(calibratedRed: 0.35, green: 0.95, blue: 0.65, alpha: 1.0),
            .kern: -0.5
        ]
        let t2Line = CTLineCreateWithAttributedString(NSAttributedString(string: "& Payday Cutoffs", attributes: t2Attrs))
        ctx.textPosition = CGPoint(x: 82, y: 1565)
        CTLineDraw(t2Line, ctx)

        // Subtitle
        let sAttrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 26, weight: .medium),
            .foregroundColor: NSColor(calibratedRed: 0.78, green: 0.94, blue: 0.86, alpha: 1.0),
            .kern: 0.2
        ]
        let sLine = CTLineCreateWithAttributedString(NSAttributedString(string: "Plan around 15th & 30th salary cutoffs, track goals & debt payoff.", attributes: sAttrs))
        ctx.textPosition = CGPoint(x: 82, y: 1475)
        CTLineDraw(sLine, ctx)
    }

    // 3. Draw cleaned image inside phone inner screen
    let innerRect = CGRect(x: innerScreenX, y: innerScreenY_unflipped, width: innerScreenWidth, height: innerScreenHeight)
    let clipPath = CGPath(roundedRect: innerRect, cornerWidth: innerCornerRadius, cornerHeight: innerCornerRadius, transform: nil)

    ctx.saveGState()
    ctx.addPath(clipPath)
    ctx.clip()

    let scale = innerScreenWidth / CGFloat(cleanedUserCg.width) // 816 / 458 = 1.78166
    let drawH = CGFloat(cleanedUserCg.height) * scale
    let drawY = (innerScreenY_unflipped + innerScreenHeight) - drawH // align top edge of screen content to top of inner bezel

    ctx.draw(cleanedUserCg, in: CGRect(x: innerScreenX, y: drawY, width: innerScreenWidth, height: drawH))
    ctx.restoreGState()

    // 4. Save output
    guard let finalCg = ctx.makeImage() else {
        print("Failed to make final image")
        return
    }
    let finalRep = NSBitmapImageRep(cgImage: finalCg)
    guard let pngData = finalRep.representation(using: .png, properties: [:]) else {
        print("Failed to encode PNG")
        return
    }

    for outFile in item.outputFiles {
        try? pngData.write(to: URL(fileURLWithPath: outFile))
        print("✓ Successfully saved \(outFile)")
    }
}

for item in items {
    renderShowcase(item: item)
}

print("All screenshots generated successfully.")
