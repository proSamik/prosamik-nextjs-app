'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Project } from '@/data/projects';
import { ProjectVisual } from './Visuals';
type PreviewProject = Pick<Project, 'slug' | 'title' | 'description' | 'type'>;
const filters = ['All', 'Apps', 'Extensions'] as const;
export default function ProjectsGallery({ projects }: { projects: PreviewProject[] }) {
    const [filter, setFilter] = useState<(typeof filters)[number]>('All');
    const visible = projects.filter(p => filter === 'All' || (filter === 'Apps' ? p.type.includes('App') : p.type.includes('Extension')));
    return <>
        <div className="project-filters" role="group" aria-label="Filter projects">{filters.map(name => <button key={name} type="button" aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>)}<span aria-live="polite">{visible.length} projects</span></div>
        <div className="projects-grid">{visible.map((p, index) => <Link className="project-tile" key={p.slug} href={`/projects/${p.slug}`}><ProjectVisual slug={p.slug} eager={index < 2} /><div className="project-caption"><span className="project-type">{p.type}</span><h2>{p.title}<ArrowUpRight size={22} /></h2><p>{p.description}</p><span className="text-link">Read the story <ArrowUpRight size={16} /></span></div></Link>)}</div>
    </>;
}
