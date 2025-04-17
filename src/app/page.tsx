'use client';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {ScrollArea} from '@/components/ui/scroll-area';
import {useEffect, useRef, useState} from 'react';
import {cn} from '@/lib/utils';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Upload, X} from 'lucide-react';
import {toast} from '@/hooks/use-toast';
import {GoogleGenerativeAI} from "@google/generative-ai";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  image?: string; // Optional image data URL
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Store image data URL
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to the bottom of the chat container when new messages are added
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string); // Store the data URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      text: input,
      isUser: true,
      image: selectedImage || undefined, // Include image if available
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setSelectedImage(null); // Clear the selected image after sending
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY;
      if (!apiKey) {
        toast({
          title: 'Error',
          description: 'NEXT_PUBLIC_GOOGLE_GENAI_API_KEY is not set. Please configure your environment variables.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

      // Start building the parts array with text if available
      const parts = [];
      if (input) {
        parts.push(input);
      }

      // Append the image if available.  Gemini accepts base64 encoded images
      if (selectedImage) {
        parts.push({inlineData: {mimeType: "image/jpeg", data: selectedImage.split(',')[1]}});
      }

      // Build the chat history.  The format is:
      // [ { role: 'user', parts: [ parts array ] }, { role: 'model', parts: [ parts array ] } ]
      const history = messages.map(message => {
        return {
          role: message.isUser ? 'user' : 'model',
          parts: [message.text, message.image ? {inlineData: {mimeType: "image/jpeg", data: message.image.split(',')[1]}} : undefined].filter(Boolean),
        };
      });

      const chat = model.startChat({history});

      const result = await chat.sendMessage(parts);

      const aiResponse = result.response.text();

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        text: aiResponse,
        isUser: false,
        image: undefined,
      };

      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Generic error message
      const errorMessage =
        error.message || 'Failed to get response from AI. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: Date.now().toString() + '-error',
          text: `Error: ${errorMessage}`,
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left side (content area) */}
      <div className="flex-1 p-4 sm:p-6">
        <div className="flex flex-col h-full">
          <div className="flex-1">
            <ScrollArea className="h-full">
              <div ref={chatContainerRef} className="space-y-4 flex w-full flex-col">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-2xl rounded-lg px-4 py-2',
                      message.isUser
                        ? 'bg-primary text-primary-foreground self-start'
                        : 'bg-secondary text-secondary-foreground self-end'
                    )}
                  >
                    {message.image && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <img
                            src={message.image}
                            alt="Uploaded"
                            className="mb-2 h-20 w-20 rounded-md object-cover cursor-pointer"
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-40 h-40 p-2">
                          <div className="relative">
                            <img
                              src={message.image}
                              alt="Uploaded"
                              className="h-full w-full rounded-md object-cover"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1 rounded-full text-destructive opacity-70 hover:opacity-100"
                              onClick={handleClearImage}
                            >
                              <X className="h-3 w-3"/>
                              <span className="sr-only">Remove Image</span>
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {message.text}
                  </div>
                ))}
                {isLoading && (
                  <div className="max-w-2xl rounded-lg px-4 py-2 bg-muted text-muted-foreground self-end">
                    Thinking...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          {/* Input area */}
          <div className="p-4 sm:p-6 border-t border-border">
            <div className="flex items-center space-x-4">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message"
                className="flex-1 resize-none h-[40px]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent newline
                    handleSendMessage();
                  }
                }}
              />
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                  ref={fileInputRef}
                />
                <label htmlFor="image-upload">
                  <Popover open={!!selectedImage} >
                    <PopoverTrigger asChild>
                      <Button variant="secondary" className='p-3' asChild>
                        <Upload className="h-10 w-10"/>
                      </Button>
                    </PopoverTrigger>
                    {selectedImage && (
                      <PopoverContent className="w-40 h-auto max-h-5 p-1">
                        <div className="relative">
                          <img
                            src={selectedImage}
                            alt="Preview"
                            className="h-full w-full rounded-md object-cover"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute -right-4 -top-4 rounded-full focus-visible:!ring-0 w-5 h-5 focus-visible:!ring-offset-0 opacity-70 focus:!ring-0 hover:opacity-100"
                            onClick={handleClearImage}
                          >
                            <X className="h-4 w-4"/>
                            <span className="sr-only">Remove Image</span>
                          </Button>
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                </label>

              </div>
              <Button onClick={handleSendMessage} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side (optional sidebar) */}
      <div className="w-80 border-l border-border p-4 sm:p-6 bg-secondary">
        {/* Add sidebar content here */}
        <h2 className="text-lg font-semibold mb-4">Sidebar</h2>
        <p className="text-sm text-muted-foreground">
          This is an example sidebar. You can add any content here.
        </p>
      </div>
    </div>
  );
}
