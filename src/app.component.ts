import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenAIService } from './services/genai.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: [] // Using Tailwind in template
})
export class AppComponent {
  private genAiService = inject(GenAIService);
  private sanitizer = inject(DomSanitizer);

  // --- State Signals ---
  
  // Inputs
  logoDescription = signal('');
  selectedSize = signal('2K'); // Default
  
  // Animation Inputs
  animationDescription = signal(''); // Optional extra instruction
  selectedAspectRatio = signal<'16:9'|'9:16'>('16:9');

  // Outputs
  generatedImage = signal<string | null>(null); // Base64 string
  generatedVideoUrl = signal<SafeUrl | null>(null); // Blob URL

  // UI State
  isGeneratingImage = signal(false);
  isGeneratingVideo = signal(false);
  error = signal<string | null>(null);
  
  // Progress/Status messages
  statusMessage = signal('');

  // --- Actions ---

  async onGenerateLogo() {
    if (!this.logoDescription().trim()) {
      this.error.set('Please describe your logo first.');
      return;
    }

    this.isGeneratingImage.set(true);
    this.error.set(null);
    this.statusMessage.set('Designing your logo...');
    this.generatedImage.set(null);
    this.generatedVideoUrl.set(null); // Reset video if new logo is made

    try {
      const base64Image = await this.genAiService.generateLogo(
        this.logoDescription(),
        this.selectedSize()
      );
      this.generatedImage.set(base64Image);
      this.statusMessage.set('Logo generated successfully!');
    } catch (err: any) {
      this.error.set(err.message || 'Failed to generate logo.');
      this.statusMessage.set('');
    } finally {
      this.isGeneratingImage.set(false);
    }
  }

  async onAnimateLogo() {
    const currentImage = this.generatedImage();
    if (!currentImage) return;

    this.isGeneratingVideo.set(true);
    this.error.set(null);
    this.statusMessage.set('Initializing Veo animation engine...');
    
    // Combine prompts if user added extra details
    const finalPrompt = this.animationDescription().trim() 
      ? this.animationDescription() 
      : this.logoDescription();

    try {
      const videoBlobUrl = await this.genAiService.animateLogo(
        currentImage,
        finalPrompt,
        this.selectedAspectRatio()
      );
      
      this.generatedVideoUrl.set(
        this.sanitizer.bypassSecurityTrustUrl(videoBlobUrl)
      );
      this.statusMessage.set('Animation complete!');
    } catch (err: any) {
      this.error.set(err.message || 'Failed to animate logo.');
      this.statusMessage.set('');
    } finally {
      this.isGeneratingVideo.set(false);
    }
  }

  // --- Helpers ---
  
  getImageSrc(): string {
    return `data:image/jpeg;base64,${this.generatedImage()}`;
  }
}