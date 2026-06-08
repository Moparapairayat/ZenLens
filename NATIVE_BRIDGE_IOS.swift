/**
 * Native Bridge Integration Guide - iOS
 * 
 * This file documents the native Swift code required for TFLite integration
 * Place the following code in: ios/ZenLens/TFLiteModule.swift
 */

/*

import Foundation
import React
import TensorFlowLite
import UIKit

@objc(TFLiteModule)
class TFLiteModule: NSObject, RCTBridgeModule {
  
  static func moduleName() -> String! {
    return "TFLiteModule"
  }
  
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  private var embeddingInterpreter: Interpreter?
  private var textInterpreter: Interpreter?
  
  override init() {
    super.init()
    setupInterpreters()
  }
  
  private func setupInterpreters() {
    do {
      // Load image embedding model
      guard let embeddingModelPath = Bundle.main.path(
        forResource: "image_embedding",
        ofType: "tflite"
      ) else {
        print("Image embedding model not found")
        return
      }
      
      embeddingInterpreter = try Interpreter(modelPath: embeddingModelPath)
      try embeddingInterpreter?.allocateTensors()
      
      // Load text embedding model
      guard let textModelPath = Bundle.main.path(
        forResource: "text_embedding",
        ofType: "tflite"
      ) else {
        print("Text embedding model not found")
        return
      }
      
      textInterpreter = try Interpreter(modelPath: textModelPath)
      try textInterpreter?.allocateTensors()
      
    } catch {
      print("Failed to setup interpreters:", error)
    }
  }
  
  @objc(runImageEmbedding:resolve:reject:)
  func runImageEmbedding(
    imageUri: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        // Load image from URI
        let image = try self.loadImage(from: imageUri)
        
        // Preprocess
        let inputData = try self.preprocessImage(image)
        
        // Run inference
        guard let interpreter = self.embeddingInterpreter else {
          throw NSError(domain: "TFLite", code: -1, userInfo: nil)
        }
        
        try interpreter.copy(inputData, toInputAt: 0)
        try interpreter.invoke()
        
        // Extract output
        let output = try interpreter.output(at: 0)
        let embedding = self.convertToFloatArray(output.data)
        
        DispatchQueue.main.async {
          resolve(embedding)
        }
      } catch {
        DispatchQueue.main.async {
          reject("TFLite", error.localizedDescription, error)
        }
      }
    }
  }
  
  @objc(runTextEmbedding:resolve:reject:)
  func runTextEmbedding(
    text: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        // Tokenize text
        let tokens = try self.tokenizeText(text)
        
        // Run inference
        guard let interpreter = self.textInterpreter else {
          throw NSError(domain: "TFLite", code: -1, userInfo: nil)
        }
        
        try interpreter.copy(tokens, toInputAt: 0)
        try interpreter.invoke()
        
        // Extract output
        let output = try interpreter.output(at: 0)
        let embedding = self.convertToFloatArray(output.data)
        
        DispatchQueue.main.async {
          resolve(embedding)
        }
      } catch {
        DispatchQueue.main.async {
          reject("TFLite", error.localizedDescription, error)
        }
      }
    }
  }
  
  private func loadImage(from uri: String) throws -> UIImage {
    let path = uri.replacingOccurrences(of: "file://", with: "")
    guard let image = UIImage(contentsOfFile: path) else {
      throw NSError(domain: "Image", code: -1, userInfo: nil)
    }
    return image
  }
  
  private func preprocessImage(_ image: UIImage) throws -> Data {
    // Resize to 224x224
    let resized = image.resized(to: CGSize(width: 224, height: 224))
    
    // Convert to RGB buffer
    guard let cgImage = resized.cgImage else {
      throw NSError(domain: "Image", code: -1, userInfo: nil)
    }
    
    let width = cgImage.width
    let height = cgImage.height
    var buffer = [UInt8](repeating: 0, count: width * height * 3)
    
    let bytesPerPixel = 4
    let bytesPerRow = cgImage.bytesPerRow
    
    let imageData = cgImage.dataProvider?.data as Data? ?? Data()
    imageData.withUnsafeBytes { ptr in
      let bytes = ptr.baseAddress!.assumingMemoryBound(to: UInt8.self)
      
      for y in 0..<height {
        for x in 0..<width {
          let pixelIndex = (y * width + x) * 3
          let byteIndex = y * bytesPerRow + x * bytesPerPixel
          
          buffer[pixelIndex] = bytes[byteIndex]       // R
          buffer[pixelIndex + 1] = bytes[byteIndex + 1] // G
          buffer[pixelIndex + 2] = bytes[byteIndex + 2] // B
        }
      }
    }
    
    return Data(buffer: buffer)
  }
  
  private func tokenizeText(_ text: String) throws -> Data {
    // Simple tokenizer - in production use proper tokenizer
    let tokens = text.lowercased()
      .components(separatedBy: " ")
      .prefix(512)
      .map { _ in UInt32.random(in: 0..<30522) } // BERT vocab size
    
    var buffer = [UInt32](tokens)
    return Data(buffer: &buffer, byteCount: buffer.count * 4)
  }
  
  private func convertToFloatArray(_ data: Data) -> [Float] {
    var array = [Float](repeating: 0, count: data.count / 4)
    data.withUnsafeBytes { ptr in
      let floatPtr = ptr.baseAddress!.assumingMemoryBound(to: Float.self)
      array = Array(UnsafeBufferPointer(start: floatPtr, count: array.count))
    }
    return array
  }
}

extension UIImage {
  func resized(to size: CGSize) -> UIImage {
    UIGraphicsBeginImageContextWithOptions(size, false, scale)
    draw(in: CGRect(origin: .zero, size: size))
    let resized = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()
    return resized ?? self
  }
}

*/
