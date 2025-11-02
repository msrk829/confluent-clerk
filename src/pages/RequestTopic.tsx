import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { requestApi } from '@/services/api';

const RequestTopic = () => {
  const [formData, setFormData] = useState({
    topic_name: '',
    partitions: '3',
    replication_factor: '2',
    description: '',
    rationale: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.rationale.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Business rationale must be at least 10 characters long',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const requestData = {
        request_type: 'TOPIC' as const,
        details: {
          topic_name: formData.topic_name,
          partitions: parseInt(formData.partitions),
          replication_factor: parseInt(formData.replication_factor),
          description: formData.description,
        },
        rationale: formData.rationale,
      };

      await requestApi.createTopicRequest(requestData);
      
      toast({
        title: 'Request submitted successfully',
        description: 'Your topic request has been submitted for approval',
      });
      
      // Reset form
      setFormData({
        topic_name: '',
        partitions: '3',
        replication_factor: '2',
        description: '',
        rationale: ''
      });
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-3xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Request New Topic</h1>
            <p className="text-muted-foreground">
              Submit a request to create a new Kafka topic
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Topic Configuration</CardTitle>
              <CardDescription>
                Provide details for your new Kafka topic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="topic_name">Topic Name *</Label>
                  <Input
                    id="topic_name"
                    value={formData.topic_name}
                    onChange={(e) => setFormData({...formData, topic_name: e.target.value})}
                    placeholder="my-application-events"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use lowercase letters, numbers, dots, underscores, and hyphens
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="partitions">Partition Count *</Label>
                    <Input
                      id="partitions"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.partitions}
                      onChange={(e) => setFormData({...formData, partitions: e.target.value})}
                      required
                    />
                    <p className="text-xs text-muted-foreground">1-100 partitions</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="replication_factor">Replication Factor *</Label>
                    <Input
                      id="replication_factor"
                      type="number"
                      min="1"
                      max="3"
                      value={formData.replication_factor}
                      onChange={(e) => setFormData({...formData, replication_factor: e.target.value})}
                      required
                    />
                    <p className="text-xs text-muted-foreground">1-3 replicas</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of what this topic will be used for"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rationale">Business Rationale *</Label>
                  <Textarea
                    id="rationale"
                    value={formData.rationale}
                    onChange={(e) => setFormData({...formData, rationale: e.target.value})}
                    placeholder="Explain why you need this topic and how it will be used"
                    rows={4}
                    required
                    className={formData.rationale.length > 0 && formData.rationale.length < 10 ? 'border-red-500' : ''}
                  />
                  <div className="flex justify-between items-center">
                    <p className={`text-xs ${formData.rationale.length > 0 && formData.rationale.length < 10 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      Minimum 10 characters required
                    </p>
                    <p className={`text-xs ${formData.rationale.length < 10 ? 'text-red-500' : 'text-green-600'}`}>
                      {formData.rationale.length}/10
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RequestTopic;
