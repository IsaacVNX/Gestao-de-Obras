
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Building, FileText, CheckCircle2, AlertTriangle, HardHat, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

type ChecklistData = {
    id: string;
    data: string;
    responsavel: string;
    status: string;
    formData: any;
    materials: any[];
};

const SectionTitle = ({ children, icon: Icon }: { children: React.ReactNode, icon?: React.ElementType }) => (
    <div className="flex items-center gap-3 mb-4">
        {Icon && <Icon className="w-6 h-6 text-primary" />}
        <h2 className="text-xl font-bold text-primary">{children}</h2>
        <Separator className="flex-1 bg-primary/20" />
    </div>
);

const InfoRow = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="flex justify-between items-start py-2">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-right font-semibold">{value || 'N/A'}</span>
    </div>
);


export default function ChecklistDetailPage() {
    const router = useRouter();
    const params = useParams();
    const obraId = params.id as string;
    const checklistId = params.checklistId as string;
    const [checklist, setChecklist] = useState<ChecklistData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!obraId || !checklistId) return;
        
        async function fetchChecklist() {
            try {
                const checklistDocRef = doc(db, 'obras', obraId, 'checklists', checklistId);
                const docSnap = await getDoc(checklistDocRef);
                if (docSnap.exists()) {
                    setChecklist({ id: docSnap.id, ...docSnap.data() } as ChecklistData);
                } else {
                     router.push(`/obras/${obraId}`);
                }
            } catch (error) {
                console.error("Erro ao buscar checklist no Firestore", error);
            } finally {
                setLoading(false);
            }
        }

        fetchChecklist();
    }, [obraId, checklistId, router]);

    if (loading) {
        return (
            <AppLayout>
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton className="h-10 w-1/3" />
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                           <Skeleton className="h-64 w-full" />
                           <Skeleton className="h-64 w-full" />
                        </div>
                        <div className="space-y-6">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!checklist) {
        return (
            <AppLayout>
                <Card>
                    <CardHeader>
                        <CardTitle>Checklist não encontrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>O checklist que você está procurando não existe ou foi removido.</p>
                        <Button onClick={() => router.back()} className="mt-4">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                        </Button>
                    </CardContent>
                </Card>
            </AppLayout>
        );
    }
    
    const { formData, materials } = checklist;

    const parseNumber = (value: string) => {
        if (!value) return 0;
        return parseFloat(String(value).replace(',', '.')) || 0;
    }

    const totalLinearMeters = materials.reduce((total, item) => {
        const quantity = parseNumber(item.quantidade);
        const linearMeter = parseNumber(item.metroLinear);
        return total + (quantity * linearMeter);
    }, 0);

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                 <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-primary">Detalhes da Ordem de Serviço</h1>
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Obra
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Informações Gerais do Andaime</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <InfoRow label="Nº do Andaime" value={formData.numAndaime} />
                                <InfoRow label="Tipo de Material" value={formData.tipoMaterial} />
                                <InfoRow label="Tipo de Andaime" value={formData.tipoAndaime} />
                                <InfoRow label="Mobilidade" value={formData.mobilidade} />
                                <InfoRow label="Altura" value={formData.altura} />
                                <InfoRow label="Largura" value={formData.largura} />
                                <InfoRow label="Comprimento" value={formData.comprimento} />
                                <InfoRow label="Metragem Cúbica (m³)" value={formData.metragemCubica} />
                                <InfoRow label="Área Ocupada (m²)" value={formData.areaOcupada} />
                            </CardContent>
                        </Card>
                        
                         <Card>
                            <CardHeader>
                                <CardTitle>Datas e Prazos</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <InfoRow label="Inicío de Montagem" value={formData.inicioMontagem} />
                                <InfoRow label="Fim da montagem" value={formData.fimMontagem} />
                                <InfoRow label="Tempo Gasto" value={formData.tempoGasto} />
                                <InfoRow label="Previsão de Desmontagem" value={formData.previsaoDesmontagem} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Descrição e Observações</CardTitle></CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <h3 className="font-semibold text-muted-foreground mb-1">Descrição do Serviço</h3>
                                    <p className="whitespace-pre-wrap p-3 bg-muted/50 rounded-md min-h-[60px]">{formData.descricao || 'Nenhuma descrição fornecida.'}</p>
                                </div>
                                 <div>
                                    <h3 className="font-semibold text-muted-foreground mb-1">Observações</h3>
                                    <p className="whitespace-pre-wrap p-3 bg-muted/50 rounded-md min-h-[60px]">{formData.observacoes || 'Nenhuma observação fornecida.'}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader><CardTitle>Materiais Utilizados</CardTitle></CardHeader>
                             <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead className="text-right w-[120px]">Quantidade</TableHead>
                                            <TableHead className="text-right w-[150px]">Metro Linear (Un.)</TableHead>
                                            <TableHead className="text-right w-[150px]">Total Linear (m)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materials.length > 0 ? materials.map((item, index) => {
                                            const quantity = parseNumber(item.quantidade);
                                            const linearMeter = parseNumber(item.metroLinear);
                                            const itemTotal = quantity * linearMeter;
                                            return (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.tipo}</TableCell>
                                                    <TableCell className="text-right">{item.quantidade}</TableCell>
                                                    <TableCell className="text-right">{item.metroLinear}</TableCell>
                                                    <TableCell className="text-right font-medium">{itemTotal.toFixed(2).replace('.', ',')}</TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">Nenhum material listado.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                     {materials.length > 0 && (
                                     <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={3} className="font-bold text-right text-primary">Metragem Linear Total Geral</TableCell>
                                            <TableCell className="font-bold text-primary text-right">{totalLinearMeters.toFixed(2).replace('.', ',')}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                    )}
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-muted dark:bg-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                     <FileText className="w-5 h-5" /> Ordem de Serviço
                                </CardTitle>
                                 <CardDescription>Resumo da O.S.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="space-y-1">
                                    <InfoRow label="Andaime Nº" value={checklist.formData.numAndaime} />
                                    <InfoRow label="Responsável" value={checklist.responsavel} />
                                    <InfoRow label="Data" value={new Date(checklist.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between pt-2">
                                    <span className="font-medium text-muted-foreground">Status</span>
                                     <Badge variant={checklist.status === 'Não Conforme' ? 'destructive' : 'default'} className="text-base">
                                        {checklist.status === 'Não Conforme' ? <AlertTriangle className="mr-2 h-4 w-4"/> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        {checklist.status}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                     <Building className="w-5 h-5" /> Cliente e Obra
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <InfoRow label="Empresa" value={formData.empresa} />
                                <InfoRow label="CNPJ" value={formData.cnpj} />
                                <InfoRow label="Cliente" value={formData.cliente} />
                                <InfoRow label="Obra" value={formData.obra} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                     <HardHat className="w-5 h-5" /> Equipe e Serviço
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <InfoRow label="Tipo de Serviço" value={formData.tipoServico} />
                                <InfoRow label="Encarregado" value={formData.encarregado} />
                                <InfoRow label="Equipe" value={formData.equipeResponsavel} />
                                <InfoRow label="Local" value={formData.localAtividade} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
