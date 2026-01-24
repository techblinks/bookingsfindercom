import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { emailTemplates, EmailTemplate } from '@/data/emailTemplates';
import { 
  ArrowLeft, 
  Users, 
  Mail, 
  Send, 
  Trash2, 
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface Subscriber {
  id: string;
  email: string;
  is_subscribed: boolean;
  subscription_source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
}

export default function AdminSubscribers() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAdminAuth();
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  
  // Bulk email state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setEmailSubject(template.subject);
      setEmailContent(template.htmlContent);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSubscribers();
    }
  }, [isAdmin]);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast.error('Failed to load subscribers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subscribers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Subscriber deleted');
      fetchSubscribers();
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      toast.error('Failed to delete subscriber');
    }
  };

  const handleToggleSubscription = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subscribers')
        .update({ 
          is_subscribed: !currentStatus,
          unsubscribed_at: !currentStatus ? null : new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? 'Subscriber deactivated' : 'Subscriber reactivated');
      fetchSubscribers();
    } catch (error) {
      console.error('Error updating subscriber:', error);
      toast.error('Failed to update subscriber');
    }
  };

  const handleSendBulkEmail = async (isTest: boolean) => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error('Please fill in subject and content');
      return;
    }

    if (isTest && !testEmail.trim()) {
      toast.error('Please enter a test email address');
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-bulk-email', {
        body: {
          subject: emailSubject,
          htmlContent: emailContent,
          testEmail: isTest ? testEmail : undefined,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      
      if (isTest) {
        toast.success(`Test email sent to ${testEmail}`);
      } else {
        toast.success(`Bulk email sent: ${result.sent} delivered, ${result.failed} failed`);
        setEmailDialogOpen(false);
        setEmailSubject('');
        setEmailContent('');
      }
    } catch (error: any) {
      console.error('Error sending bulk email:', error);
      toast.error(error.message || 'Failed to send emails');
    } finally {
      setIsSending(false);
    }
  };

  const handleExportCSV = () => {
    const activeSubscribers = subscribers.filter(s => s.is_subscribed);
    const csv = [
      'Email,Source,Subscribed At',
      ...activeSubscribers.map(s => 
        `${s.email},${s.subscription_source},${new Date(s.subscribed_at).toISOString()}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Subscribers exported');
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.subscription_source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive = !showOnlyActive || sub.is_subscribed;
    return matchesSearch && matchesActive;
  });

  const activeCount = subscribers.filter(s => s.is_subscribed).length;
  const inactiveCount = subscribers.filter(s => !s.is_subscribed).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>Please sign in with an admin account</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLoginForm />
            {user && !isAdmin && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out and try different account
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Subscriber Management | Admin | BookingsFinder</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Subscriber Management</h1>
              <p className="text-muted-foreground">Manage email subscribers and send campaigns</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{subscribers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{inactiveCount}</p>
                  <p className="text-sm text-muted-foreground">Unsubscribed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {subscribers.filter(s => {
                      const date = new Date(s.created_at);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscribers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={showOnlyActive}
              onCheckedChange={setShowOnlyActive}
              id="active-only"
            />
            <label htmlFor="active-only" className="text-sm">Active only</label>
          </div>
          <Button variant="outline" onClick={fetchSubscribers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send Email Campaign</DialogTitle>
                <DialogDescription>
                  Send a promotional email to {activeCount} active subscribers
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="templates" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="templates">
                    <FileText className="h-4 w-4 mr-2" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="custom">
                    <Mail className="h-4 w-4 mr-2" />
                    Custom
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="templates" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {emailTemplates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all hover:border-primary/50 ${
                          selectedTemplate === template.id ? 'border-primary ring-2 ring-primary/20' : ''
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{template.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                            </div>
                            {selectedTemplate === template.id && (
                              <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {selectedTemplate && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewDialogOpen(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Template
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="custom" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      placeholder="e.g., 🔥 Flash Sale: 50% Off All Flights!"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">HTML Content</label>
                    <Textarea
                      placeholder="Enter your email HTML content..."
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {"{{unsubscribe_url}}"} to insert the unsubscribe link
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Selected Email</label>
                  <Badge variant="outline">{emailSubject ? emailSubject.slice(0, 40) + (emailSubject.length > 40 ? '...' : '') : 'None selected'}</Badge>
                </div>
                <label className="text-sm font-medium">Test Email (optional)</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => handleSendBulkEmail(true)}
                    disabled={isSending || !emailSubject || !emailContent}
                  >
                    Send Test
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                  Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isSending || !emailSubject || !emailContent}>
                      {isSending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to {activeCount} subscribers
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Bulk Send</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to send this email to {activeCount} active subscribers. 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleSendBulkEmail(false)}>
                        Yes, Send Emails
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Subscribers Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No subscribers found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Subscribers will appear here when users create price alerts'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscribed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{subscriber.subscription_source}</Badge>
                      </TableCell>
                      <TableCell>
                        {subscriber.is_subscribed ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Unsubscribed</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(subscriber.subscribed_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={subscriber.is_subscribed}
                            onCheckedChange={() => handleToggleSubscription(subscriber.id, subscriber.is_subscribed)}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Subscriber</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {subscriber.email}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSubscriber(subscriber.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Subject: {emailSubject}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] border rounded-lg">
            <iframe
              srcDoc={emailContent}
              className="w-full h-[500px] border-0"
              title="Email Preview"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
