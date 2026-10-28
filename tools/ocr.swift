// Prints the text macOS Vision finds in an image, one line per text block: lets Claude read mod HUDs (the
// Interceptors dash's tornado distance) from screenshots without looking at them. Build: swiftc -O ocr.swift -o ocr
import Vision
import AppKit
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
try? VNImageRequestHandler(cgImage: cg).perform([req])
for o in req.results ?? [] { if let t = o.topCandidates(1).first { print(t.string) } }
