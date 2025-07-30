
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type VersionData = {
    formData: any;
    materials: any[];
    savedAt: string;
    savedBy: string;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-lg font-semibold text-primary mt-6 mb-2 text-center">{children}</h2>
);

const InfoRow = ({ label, value }: { label: string, value: string | undefined }) => (
    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-right">{value || 'N/A'}</span>
    </div>
);

const InfoGrid = ({ children, cols = 2 }: { children: React.ReactNode, cols?: number }) => (
    <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-2`}>
        {children}
    </div>
);


export default function VersionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const obraId = params.id as string;
    const checklistId = params.checklistId as string;
    const versionId = params.versionId as string;

    const [version, setVersion] = useState<VersionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!obraId || !checklistId || !versionId) return;
        
        async function fetchVersion() {
            setLoading(true);
            try {
                const versionDocRef = doc(db, 'obras', obraId, 'checklists', checklistId, 'versions', versionId);
                const docSnap = await getDoc(versionDocRef);
                if (docSnap.exists()) {
                    setVersion(docSnap.data() as VersionData);
                } else {
                    // Redirect back if version not found
                    router.back();
                }
            } catch (error) {
                console.error("Erro ao buscar versão no Firestore", error);
            } finally {
                setLoading(false);
            }
        }

        fetchVersion();
    }, [obraId, checklistId, versionId, router]);

    if (loading) {
        return (
            <AppLayout>
                <div className="max-w-5xl mx-auto space-y-6">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </AppLayout>
        );
    }
    
    if (!version) {
        // This case is mostly handled by the redirect in useEffect, but it's good practice.
        return <AppLayout><p>Versão não encontrada.</p></AppLayout>;
    }

    const { formData, materials, savedAt, savedBy } = version;
    
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
            <div className="max-w-5xl mx-auto space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-primary">Versão do Andaime nº {formData.numAndaime}</h1>
                        <p className="text-muted-foreground">Salvo por <span className="font-semibold text-foreground">{savedBy}</span> em {new Date(savedAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Histórico
                    </Button>
                </div>
                
                <Card>
                    <CardContent className="p-6 text-sm">
                        <SectionTitle>Dados do Pedido</SectionTitle>
                         <div className="space-y-2">
                            <InfoRow label="Empresa" value={formData.empresa} />
                            <InfoRow label="CNPJ" value={formData.cnpj} />
                            <InfoRow label="Ordem de Serviço nº" value={formData.ordemServico} />
                            <InfoRow label="Solicitante" value={formData.solicitante} />
                            <InfoRow label="Orçamento nº" value={formData.orcamento} />
                            <InfoRow label="ART" value={formData.art} />
                            <InfoRow label="Cliente" value={formData.cliente} />
                            <InfoRow label="Obra" value={formData.obra} />
                            <InfoRow label="Tipo de atendimento" value={formData.tipoAtendimento} />
                        </div>

                        <SectionTitle>Detalhes do Serviço</SectionTitle>
                        <div className="space-y-2">
                             <InfoRow label="Tipo de Serviço" value={formData.tipoServico} />
                             <InfoRow label="Encarregado" value={formData.encarregado} />
                             <InfoRow label="Equipe Responsável" value={formData.equipeResponsavel} />
                             <InfoRow label="Local da Atividade" value={formData.localAtividade} />
                             <InfoRow label="Unidade" value={formData.unidade} />
                             <InfoRow label="Setor" value={formData.setor} />
                             <InfoRow label="Equipamento" value={formData.equipamento} />
                             <InfoRow label="Código do Equipamento" value={formData.codigoEquipamento} />
                        </div>
                        
                        <SectionTitle>Informações sobre o andaime</SectionTitle>
                        <InfoGrid cols={2}>
                            <InfoRow label="Nº do Andaime" value={formData.numAndaime} />
                            <InfoRow label="Tipo de Material" value={formData.tipoMaterial} />
                            <InfoRow label="Altura" value={formData.altura} />
                            <InfoRow label="Largura" value={formData.largura} />
                            <InfoRow label="Comprimento" value={formData.comprimento} />
                            <InfoRow label="Tipo de Andaime" value={formData.tipoAndaime} />
                            <InfoRow label="Mobilidade" value={formData.mobilidade} />
                            <InfoRow label="Metragem Cúbica" value={formData.metragemCubica} />
                            <InfoRow label="Área Ocupada (m²)" value={formData.areaOcupada} />
                        </InfoGrid>

                        <SectionTitle>Previsão de Desmontagem</SectionTitle>
                        <InfoGrid cols={2}>
                            <InfoRow label="Inicío de Montagem" value={formData.inicioMontagem} />
                            <InfoRow label="Fim da montagem" value={formData.fimMontagem} />
                            <InfoRow label="Tempo Gasto" value={formData.tempoGasto} />
                            <InfoRow label="Previsão de Desmontagem" value={formData.previsaoDesmontagem} />
                        </InfoGrid>
                        
                        <SectionTitle>Descrição</SectionTitle>
                        <p className="p-3 bg-muted/50 rounded-md whitespace-pre-wrap">{formData.descricao}</p>
                        
                        <SectionTitle>Observações</SectionTitle>
                        <p className="p-3 bg-muted/50 rounded-md whitespace-pre-wrap">{formData.observacoes}</p>

                        <SectionTitle>Materiais Utilizados</SectionTitle>
                        <Card>
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
                                        {materials.map((item, index) => {
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
                                        })}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={3} className="font-bold text-right text-primary">Metragem Linear Total Geral</TableCell>
                                            <TableCell className="font-bold text-primary text-right">{totalLinearMeters.toFixed(2).replace('.', ',')}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
