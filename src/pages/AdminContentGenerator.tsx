import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Check, 
  Copy, 
  Save,
  Plane,
  Hotel,
  Eye,
  RefreshCw,
  CalendarClock,
  Clock
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedContent {
  slug: string;
  type: 'flights' | 'hotels';
  origin: string;
  destination: string;
  title: string;
  metaDescription: string;
  h1Title: string;
  introParagraph: string;
  mainContent: string;
  travelTips: { title: string; content: string }[];
  faqs: { question: string; answer: string }[];
  popularCities: { name: string; code: string }[];
}

export default function AdminContentGenerator() {
  const { user, isLoading: authLoading, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  
  const [contentType, setContentType] = useState<'flights' | 'hotels'>('flights');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedContent, setEditedContent] = useState<GeneratedContent | null>(null);
  const [scheduledPublishAt, setScheduledPublishAt] = useState<string>('');

  const handleGenerate = async () => {
    if (!destination.trim()) {
      toast.error('Please enter a destination');
      return;
    }
    if (contentType === 'flights' && !origin.trim()) {
      toast.error('Please enter an origin for flight content');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);
    setEditedContent(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-seo-content', {
        body: {
          origin: contentType === 'flights' ? origin.trim() : destination.trim(),
          destination: destination.trim(),
          type: contentType,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedContent(data.content);
      setEditedContent(data.content);
      toast.success('Content generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (publishNow: boolean = false) => {
    if (!editedContent) return;

    setIsSaving(true);
    try {
      // Map to country_landing_pages table structure
      const pageData = {
        slug: editedContent.slug,
        type: editedContent.type,
        country_name: editedContent.destination,
        country_code: editedContent.destination.substring(0, 2).toUpperCase(),
        title: editedContent.title,
        meta_description: editedContent.metaDescription,
        h1_title: editedContent.h1Title,
        intro_paragraph: editedContent.introParagraph,
        main_content: editedContent.mainContent,
        popular_cities: editedContent.popularCities,
        popular_routes: contentType === 'flights' 
          ? [{ from: editedContent.origin, to: editedContent.destination }]
          : [],
        travel_tips: editedContent.travelTips,
        faqs: editedContent.faqs,
        is_published: publishNow,
        scheduled_publish_at: !publishNow && scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
      };

      const { error } = await supabase
        .from('country_landing_pages')
        .insert(pageData);

      if (error) throw error;

      if (publishNow) {
        toast.success('Content published successfully!');
      } else if (scheduledPublishAt) {
        toast.success(`Content scheduled to publish on ${new Date(scheduledPublishAt).toLocaleString()}`);
      } else {
        toast.success('Content saved as draft!');
      }
      navigate('/admin/country-pages');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <AdminLoginForm />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>AI Content Generator | Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Back button */}
          <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Admin
          </Link>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Content Generator</h1>
              <p className="text-muted-foreground">
                Generate SEO-optimized landing pages with AI
              </p>
            </div>
          </div>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate New Content</CardTitle>
              <CardDescription>
                Enter route details to generate unique, SEO-optimized content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Type Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={contentType === 'flights' ? 'default' : 'outline'}
                  onClick={() => setContentType('flights')}
                  className="gap-2"
                >
                  <Plane className="h-4 w-4" />
                  Flights
                </Button>
                <Button
                  variant={contentType === 'hotels' ? 'default' : 'outline'}
                  onClick={() => setContentType('hotels')}
                  className="gap-2"
                >
                  <Hotel className="h-4 w-4" />
                  Hotels
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {contentType === 'flights' && (
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origin City</Label>
                    <Input
                      id="origin"
                      placeholder="e.g., London, New York, Sydney"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="destination">
                    {contentType === 'flights' ? 'Destination City' : 'City / Destination'}
                  </Label>
                  <Input
                    id="destination"
                    placeholder="e.g., Paris, Tokyo, Dubai"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !destination}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Content Preview */}
          {editedContent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Generated Content
                      <Badge variant="secondary">{editedContent.type}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Review and edit before saving
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-3">
                    {/* Scheduling options */}
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <CalendarClock className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <Label htmlFor="schedule" className="text-sm">Schedule Publishing</Label>
                        <Input
                          id="schedule"
                          type="datetime-local"
                          value={scheduledPublishAt}
                          onChange={(e) => setScheduledPublishAt(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : scheduledPublishAt ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {scheduledPublishAt ? 'Schedule' : 'Save Draft'}
                      </Button>
                      <Button
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Publish Now
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="meta" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="meta">SEO Meta</TabsTrigger>
                    <TabsTrigger value="content">Main Content</TabsTrigger>
                    <TabsTrigger value="tips">Tips & FAQs</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>

                  {/* SEO Meta Tab */}
                  <TabsContent value="meta" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>URL Slug</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(editedContent.slug, 'Slug')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={editedContent.slug}
                        onChange={(e) => setEditedContent({ ...editedContent, slug: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Title Tag ({editedContent.title.length}/60)</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(editedContent.title, 'Title')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={editedContent.title}
                        onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                        className={editedContent.title.length > 60 ? 'border-destructive' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Meta Description ({editedContent.metaDescription.length}/160)</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(editedContent.metaDescription, 'Meta description')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={editedContent.metaDescription}
                        onChange={(e) => setEditedContent({ ...editedContent, metaDescription: e.target.value })}
                        className={editedContent.metaDescription.length > 160 ? 'border-destructive' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>H1 Title</Label>
                      <Input
                        value={editedContent.h1Title}
                        onChange={(e) => setEditedContent({ ...editedContent, h1Title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Intro Paragraph</Label>
                      <Textarea
                        value={editedContent.introParagraph}
                        onChange={(e) => setEditedContent({ ...editedContent, introParagraph: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* Main Content Tab */}
                  <TabsContent value="content" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Main Article Content (Markdown)</Label>
                      <Textarea
                        value={editedContent.mainContent}
                        onChange={(e) => setEditedContent({ ...editedContent, mainContent: e.target.value })}
                        rows={20}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Word count: ~{editedContent.mainContent.split(/\s+/).length} words
                      </p>
                    </div>
                  </TabsContent>

                  {/* Tips & FAQs Tab */}
                  <TabsContent value="tips" className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Travel Tips</Label>
                      {editedContent.travelTips.map((tip, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-2">
                            <Input
                              value={tip.title}
                              onChange={(e) => {
                                const newTips = [...editedContent.travelTips];
                                newTips[index] = { ...tip, title: e.target.value };
                                setEditedContent({ ...editedContent, travelTips: newTips });
                              }}
                              placeholder="Tip title"
                              className="font-medium"
                            />
                            <Textarea
                              value={tip.content}
                              onChange={(e) => {
                                const newTips = [...editedContent.travelTips];
                                newTips[index] = { ...tip, content: e.target.value };
                                setEditedContent({ ...editedContent, travelTips: newTips });
                              }}
                              placeholder="Tip content"
                              rows={2}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">FAQs (Schema Ready)</Label>
                      {editedContent.faqs.map((faq, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-2">
                            <Input
                              value={faq.question}
                              onChange={(e) => {
                                const newFaqs = [...editedContent.faqs];
                                newFaqs[index] = { ...faq, question: e.target.value };
                                setEditedContent({ ...editedContent, faqs: newFaqs });
                              }}
                              placeholder="Question"
                              className="font-medium"
                            />
                            <Textarea
                              value={faq.answer}
                              onChange={(e) => {
                                const newFaqs = [...editedContent.faqs];
                                newFaqs[index] = { ...faq, answer: e.target.value };
                                setEditedContent({ ...editedContent, faqs: newFaqs });
                              }}
                              placeholder="Answer"
                              rows={2}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Related Cities</Label>
                      <div className="flex flex-wrap gap-2">
                        {editedContent.popularCities.map((city, index) => (
                          <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                            {city.name} ({city.code})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Preview Tab */}
                  <TabsContent value="preview">
                    <Card className="p-6">
                      <div className="space-y-4">
                        {/* Google SERP Preview */}
                        <div className="border rounded-lg p-4 bg-white">
                          <p className="text-sm text-muted-foreground mb-2">Google Search Preview</p>
                          <div className="space-y-1">
                            <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                              {editedContent.title}
                            </p>
                            <p className="text-sm text-green-700">
                              bookingsfinder.com/{editedContent.slug}
                            </p>
                            <p className="text-sm text-gray-600">
                              {editedContent.metaDescription}
                            </p>
                          </div>
                        </div>

                        {/* Content Preview */}
                        <div className="prose prose-sm max-w-none">
                          <h1>{editedContent.h1Title}</h1>
                          <p className="lead">{editedContent.introParagraph}</p>
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: editedContent.mainContent
                                .replace(/## (.*)/g, '<h2>$1</h2>')
                                .replace(/\n\n/g, '</p><p>')
                                .replace(/^/, '<p>')
                                .replace(/$/, '</p>')
                            }} 
                          />
                        </div>

                        {/* FAQ Preview */}
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
                          <Accordion type="single" collapsible>
                            {editedContent.faqs.map((faq, index) => (
                              <AccordionItem key={index} value={`faq-${index}`}>
                                <AccordionTrigger>{faq.question}</AccordionTrigger>
                                <AccordionContent>{faq.answer}</AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
