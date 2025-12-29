import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GenAIService {
  private readonly ai: GoogleGenAI;

  constructor() {
    // Initialize the GenAI client with the environment API key
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] || '' });
  }

  /**
   * Generates an image (Logo) using the specified model and settings.
   */
  async generateLogo(prompt: string, size: string): Promise<string> {
    // We map the requested size to the prompt text to influence detail,
    // as the API handles resolution via aspect ratio usually, but prompt engineering helps for "4K" style.
    const enhancedPrompt = `Professional logo design, ${prompt}, high quality, ${size} resolution, minimalist, vector art style, centered on white background`;
    
    try {
      const response = await this.ai.models.generateImages({
        model: 'gemini-3-pro-image-preview',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1', 
        }
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
      }
      throw new Error('No image generated.');
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  }

  /**
   * Generates a video animation from a base64 image and a prompt.
   */
  async animateLogo(imageBase64: string, prompt: string, aspectRatio: '16:9' | '9:16'): Promise<string> {
    try {
      let operation = await this.ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic motion, animate this logo: ${prompt}`,
        image: {
          imageBytes: imageBase64,
          mimeType: 'image/jpeg'
        },
        config: {
          numberOfVideos: 1,
          aspectRatio: aspectRatio
        }
      });

      // Poll for completion
      while (!operation.done) {
        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await this.ai.operations.getVideosOperation({ operation: operation });
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        throw new Error('Video generation failed to return a URI.');
      }

      // Fetch the actual video content using the URI and API Key
      const response = await fetch(`${videoUri}&key=${process.env['API_KEY']}`);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);

    } catch (error) {
      console.error('Video generation error:', error);
      throw error;
    }
  }
}