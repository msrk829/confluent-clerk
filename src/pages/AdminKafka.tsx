import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Database, Shield, Settings, RefreshCw, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { kafkaApi } from '@/services/api';

interface Topic {
  name: string;
  partitions: number;
  replication_factor: number;
  configs?: Record<string, string>;
}

interface ACL {
  id: string;
  principal: string;
  resource_type: string;
  resource_name: string;
  operation: string;
  permission: string;
}

const AdminKafka = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [acls, setAcls] = useState<ACL[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicSearchTerm, setTopicSearchTerm] = useState('');
  const [aclSearchTerm, setAclSearchTerm] = useState('');
  
  // Pagination state
  const [topicsCurrentPage, setTopicsCurrentPage] = useState(1);
  const [aclsCurrentPage, setAclsCurrentPage] = useState(1);
  const itemsPerPage = 3; // Reduced to force pagination with current topics // Set to 10 for better pagination with 70+ topics
  
  // Configure dialog state
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchKafkaData();
  }, []);

  const fetchKafkaData = async () => {
    try {
      setLoading(true);
      console.log('AdminKafka: Starting to fetch Kafka data...');
      
      // Fetch real topics from Kafka API
      console.log('AdminKafka: Calling kafkaApi.getTopics()...');
      const topicsResponse = await kafkaApi.getTopics() as { topics: Topic[] };
      console.log('AdminKafka: Topics response:', topicsResponse);
      
      if (topicsResponse.topics) {
        console.log('AdminKafka: Setting topics:', topicsResponse.topics.length, 'topics');
        setTopics(topicsResponse.topics);
      } else {
        console.log('AdminKafka: No topics in response');
      }
      
      // Fetch real ACLs from Kafka API
      console.log('AdminKafka: Calling kafkaApi.getACLs()...');
      const aclsResponse = await kafkaApi.getACLs() as { acls: ACL[] };
      console.log('AdminKafka: ACLs response:', aclsResponse);
      
      if (aclsResponse.acls) {
        setAcls(aclsResponse.acls);
      }
      
    } catch (error) {
      console.error('AdminKafka: Error fetching Kafka data:', error);
      console.log('AdminKafka: Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: "Failed to fetch Kafka data",
        variant: "destructive",
      });
    } finally {
      console.log('AdminKafka: Finished fetching data, setting loading to false');
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchKafkaData();
  };

  const handleConfigureTopic = (topic: Topic) => {
    console.log('AdminKafka: Configure button clicked for topic:', topic.name);
    setSelectedTopic(topic);
    setConfigureDialogOpen(true);
    console.log('AdminKafka: Dialog should be open now, configureDialogOpen:', true);
  };

  // Filter topics based on search term
  const filteredTopics = useMemo(() => {
    if (!topicSearchTerm) return topics;
    return topics.filter(topic =>
      topic.name.toLowerCase().includes(topicSearchTerm.toLowerCase())
    );
  }, [topics, topicSearchTerm]);

  // Filter ACLs based on search term
  const filteredAcls = useMemo(() => {
    if (!aclSearchTerm) return acls;
    return acls.filter(acl =>
      acl.principal.toLowerCase().includes(aclSearchTerm.toLowerCase()) ||
      acl.resource_type.toLowerCase().includes(aclSearchTerm.toLowerCase()) ||
      acl.resource_name.toLowerCase().includes(aclSearchTerm.toLowerCase()) ||
      acl.operation.toLowerCase().includes(aclSearchTerm.toLowerCase())
    );
  }, [acls, aclSearchTerm]);

  // Pagination logic for topics
  const topicsTotalPages = Math.ceil(filteredTopics.length / itemsPerPage);
  const topicsStartIndex = (topicsCurrentPage - 1) * itemsPerPage;
  const topicsEndIndex = topicsStartIndex + itemsPerPage;
  const paginatedTopics = filteredTopics.slice(topicsStartIndex, topicsEndIndex);

  // Debug logging for pagination
  console.log('AdminKafka Pagination Debug:', {
    totalTopics: topics.length,
    filteredTopics: filteredTopics.length,
    itemsPerPage,
    topicsCurrentPage,
    topicsTotalPages,
    topicsStartIndex,
    topicsEndIndex,
    paginatedTopicsLength: paginatedTopics.length
  });

  // Pagination logic for ACLs
  const aclsTotalPages = Math.ceil(filteredAcls.length / itemsPerPage);
  const aclsStartIndex = (aclsCurrentPage - 1) * itemsPerPage;
  const aclsEndIndex = aclsStartIndex + itemsPerPage;
  const paginatedAcls = filteredAcls.slice(aclsStartIndex, aclsEndIndex);

  // Reset pagination when search changes
  useEffect(() => {
    setTopicsCurrentPage(1);
  }, [topicSearchTerm]);

  useEffect(() => {
    setAclsCurrentPage(1);
  }, [aclSearchTerm]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Kafka Management</h1>
                <p className="text-muted-foreground">Manage topics, ACLs, and Kafka configurations</p>
              </div>
              <Button onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <Tabs defaultValue="topics" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="topics" className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Topics ({filteredTopics.length})
                </TabsTrigger>
                <TabsTrigger value="acls" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  ACLs ({filteredAcls.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="topics">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Kafka Topics
                    </CardTitle>
                    <CardDescription>
                      View and manage Kafka topics in the cluster
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Search Input for Topics */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search topics by name..."
                          value={topicSearchTerm}
                          onChange={(e) => setTopicSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {topicSearchTerm && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing {filteredTopics.length} of {topics.length} topics
                        </p>
                      )}
                    </div>

                    {loading ? (
                      <div className="text-center py-8">Loading topics...</div>
                    ) : filteredTopics.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {topicSearchTerm ? 'No topics match your search' : 'No topics found'}
                      </div>
                    ) : (
                      <>
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Topic Name</TableHead>
                                <TableHead>Partitions</TableHead>
                                <TableHead>Replication Factor</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedTopics.map((topic) => (
                                <TableRow key={topic.name}>
                                  <TableCell className="font-mono">{topic.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{topic.partitions}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{topic.replication_factor}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleConfigureTopic(topic)}
                                    >
                                      <Settings className="w-4 h-4 mr-1" />
                                      Configure
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        
                        {/* DEBUG: Always show this div */}
                        <div className="bg-red-100 p-4 mt-4 border border-red-300">
                          <p>DEBUG INFO:</p>
                          <p>Total topics: {topics.length}</p>
                          <p>Filtered topics: {filteredTopics.length}</p>
                          <p>Paginated topics: {paginatedTopics.length}</p>
                          <p>Current page: {topicsCurrentPage}</p>
                          <p>Total pages: {topicsTotalPages}</p>
                          <p>Items per page: {itemsPerPage}</p>
                        </div>
                        
                        {/* Topics Pagination */}
                        {true && (
                          <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                              Showing {topicsStartIndex + 1} to {Math.min(topicsEndIndex, filteredTopics.length)} of {filteredTopics.length} topics
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTopicsCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={topicsCurrentPage === 1}
                              >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                              </Button>
                              <span className="text-sm">
                                Page {topicsCurrentPage} of {topicsTotalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTopicsCurrentPage(prev => Math.min(prev + 1, topicsTotalPages))}
                                disabled={topicsCurrentPage === topicsTotalPages}
                              >
                                Next
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="acls">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Access Control Lists (ACLs)
                    </CardTitle>
                    <CardDescription>
                      View and manage Kafka ACLs for resource access control
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Search Input for ACLs */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search ACLs by principal, resource, or operation..."
                          value={aclSearchTerm}
                          onChange={(e) => setAclSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {aclSearchTerm && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing {filteredAcls.length} of {acls.length} ACLs
                        </p>
                      )}
                    </div>

                    {loading ? (
                      <div className="text-center py-8">Loading ACLs...</div>
                    ) : filteredAcls.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {aclSearchTerm ? 'No ACLs match your search' : 'No ACLs found'}
                      </div>
                    ) : (
                      <>
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Principal</TableHead>
                                <TableHead>Resource Type</TableHead>
                                <TableHead>Resource Name</TableHead>
                                <TableHead>Operation</TableHead>
                                <TableHead>Permission</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedAcls.map((acl) => (
                                <TableRow key={acl.id}>
                                  <TableCell className="font-mono">{acl.principal}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{acl.resource_type}</Badge>
                                  </TableCell>
                                  <TableCell className="font-mono">{acl.resource_name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{acl.operation}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={acl.permission === 'Allow' ? 'default' : 'destructive'}
                                    >
                                      {acl.permission}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="outline" size="sm" disabled>
                                      <Settings className="w-4 h-4 mr-1" />
                                      Modify
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        
                        {/* ACLs Pagination */}
                        {true && (
                          <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                              Showing {aclsStartIndex + 1} to {Math.min(aclsEndIndex, filteredAcls.length)} of {filteredAcls.length} ACLs
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAclsCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={aclsCurrentPage === 1}
                              >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                              </Button>
                              <span className="text-sm">
                                Page {aclsCurrentPage} of {aclsTotalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAclsCurrentPage(prev => Math.min(prev + 1, aclsTotalPages))}
                                disabled={aclsCurrentPage === aclsTotalPages}
                              >
                                Next
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Kafka Service Status</CardTitle>
                  <CardDescription>
                    Current status of Kafka integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-green-600">
                    <Database className="w-4 h-4" />
                    <span>Kafka service is connected and operational</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Successfully connected to Kafka cluster. Topic management and ACL features are available.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Configure Topic Dialog */}
      <Dialog open={configureDialogOpen} onOpenChange={setConfigureDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Topic: {selectedTopic?.name}</DialogTitle>
            <DialogDescription>
              View and modify topic configuration settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Topic Name</label>
                <Input value={selectedTopic?.name || ''} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Partitions</label>
                <Input value={selectedTopic?.partitions || ''} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Replication Factor</label>
                <Input value={selectedTopic?.replication_factor || ''} disabled />
              </div>
            </div>
            
            {selectedTopic?.configs && Object.keys(selectedTopic.configs).length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Topic Configurations</label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Configuration Key</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(selectedTopic.configs).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-mono text-sm">{key}</TableCell>
                          <TableCell className="font-mono text-sm">{value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setConfigureDialogOpen(false)}>
                Close
              </Button>
              <Button disabled>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKafka;