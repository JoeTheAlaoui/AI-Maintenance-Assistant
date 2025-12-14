'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Send, MessageSquare, Loader2, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ContactPage() {
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSending(true)

        // Simulate sending
        await new Promise(resolve => setTimeout(resolve, 2000))

        setSending(false)
        setSent(true)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4 py-8 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-2xl border-2">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Get in Touch
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    Have a question or feedback? We'd love to hear from you.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Contact Info Cards */}
                <div className="space-y-4">
                    {[
                        {
                            icon: Mail,
                            title: 'Email',
                            value: 'contact@opengmao.com',
                            color: 'from-blue-500 to-cyan-600'
                        },
                        {
                            icon: Phone,
                            title: 'Phone',
                            value: '+212 XXX XXXXXX',
                            color: 'from-green-500 to-emerald-600'
                        },
                        {
                            icon: MapPin,
                            title: 'Location',
                            value: 'OFPPT, Morocco',
                            color: 'from-purple-500 to-pink-600'
                        }
                    ].map((item) => (
                        <Card key={item.title} className="border-2 card-hover">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                                    <item.icon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{item.title}</p>
                                    <p className="font-semibold">{item.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Contact Form */}
                <Card className="lg:col-span-2 border-2">
                    <CardHeader>
                        <CardTitle>Send us a Message</CardTitle>
                        <CardDescription>
                            Fill out the form below and we'll get back to you as soon as possible.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sent ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="h-10 w-10 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                                <p className="text-muted-foreground mb-4">
                                    Thank you for reaching out. We'll respond within 24 hours.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSent(false)
                                        setFormData({ name: '', email: '', subject: '', message: '' })
                                    }}
                                >
                                    Send Another Message
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="Your name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="h-11 border-2 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="your@email.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="h-11 border-2 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input
                                        id="subject"
                                        placeholder="How can we help?"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        required
                                        className="h-11 border-2 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Tell us more about your inquiry..."
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        required
                                        rows={5}
                                        className="border-2 rounded-xl resize-none"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full btn-gradient rounded-xl h-12 text-base"
                                    disabled={sending}
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-5 w-5" />
                                            Send Message
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
