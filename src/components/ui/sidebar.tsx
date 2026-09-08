import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cva, type VariantProps } from 'class-variance-authority'
import { PanelLeft } from 'lucide-react'
import { cn } from '@/lib/format'

/**
 * Port do sidebar do shadcn para os tokens deste projeto. Sem Sheet nem
 * Skeleton: o dashboard tem largura mínima de 1366px e nunca cai em mobile.
 */

const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = '224px'
const SIDEBAR_WIDTH_ICON = '56px'
const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

type SidebarContextValue = {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error('useSidebar precisa estar dentro de um SidebarProvider.')
  return context
}

export function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & { defaultOpen?: boolean }) {
  const [open, _setOpen] = React.useState(defaultOpen)

  const setOpen = React.useCallback((valor: boolean | ((v: boolean) => boolean)) => {
    _setOpen((atual) => {
      const proximo = typeof valor === 'function' ? valor(atual) : valor
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${proximo}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      return proximo
    })
  }, [])

  const toggleSidebar = React.useCallback(() => setOpen((v) => !v), [setOpen])

  React.useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === SIDEBAR_KEYBOARD_SHORTCUT && (evento.metaKey || evento.ctrlKey)) {
        evento.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [toggleSidebar])

  const valor = React.useMemo<SidebarContextValue>(
    () => ({ state: open ? 'expanded' : 'collapsed', open, setOpen, toggleSidebar }),
    [open, setOpen, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={valor}>
      <TooltipPrimitive.Provider delayDuration={0}>
        <div
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH,
              '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn('flex h-screen w-full overflow-hidden', className)}
          {...props}
        >
          {children}
        </div>
      </TooltipPrimitive.Provider>
    </SidebarContext.Provider>
  )
}

export function Sidebar({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { state } = useSidebar()

  return (
    <div
      data-state={state}
      className={cn(
        'group flex h-full shrink-0 flex-col border-r border-stroke bg-areia-barra transition-[width] duration-200 ease-linear',
        state === 'expanded' ? 'w-[--sidebar-width]' : 'w-[--sidebar-width-icon]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  const { state } = useSidebar()
  return (
    <div
      className={cn(
        'label-track flex h-7 shrink-0 items-center px-2 transition-opacity duration-200',
        state === 'collapsed' && 'pointer-events-none h-0 opacity-0',
        className,
      )}
      {...props}
    />
  )
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('w-full text-[14px]', className)} {...props} />
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul className={cn('flex w-full min-w-0 flex-col gap-0.5', className)} {...props} />
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li className={cn('group/menu-item relative', className)} {...props} />
}

const sidebarMenuButtonVariants = cva(
  'flex w-full items-center gap-2.5 overflow-hidden rounded-[10px] px-2.5 text-left outline-none transition-colors hover:bg-areia-ativo/70 focus-visible:ring-2 focus-visible:ring-rosa/30 disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-areia-ativo data-[active=true]:font-medium data-[active=true]:text-ink [&>svg]:size-[18px] [&>svg]:shrink-0 [&>span:last-child]:truncate',
  {
    variants: {
      size: {
        default: 'h-9 text-[14px]',
        lg: 'h-12 text-[14px]',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  size,
  tooltip,
  className,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string
  }) {
  const Comp = asChild ? Slot : 'button'
  const { state } = useSidebar()

  const botao = (
    <Comp
      data-active={isActive}
      className={cn(
        sidebarMenuButtonVariants({ size }),
        !isActive && 'text-[#525252]',
        state === 'collapsed' && 'justify-center px-0',
        className,
      )}
      {...props}
    />
  )

  if (!tooltip || state === 'expanded') return botao

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{botao}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="right"
          align="center"
          sideOffset={8}
          className="z-50 rounded-md bg-ink px-2.5 py-1.5 text-[12px] text-white"
        >
          {tooltip}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar, state } = useSidebar()

  return (
    <button
      type="button"
      aria-label={state === 'expanded' ? 'Recolher menu' : 'Expandir menu'}
      title={`${state === 'expanded' ? 'Recolher' : 'Expandir'} menu (Ctrl+B)`}
      onClick={(evento) => {
        onClick?.(evento)
        toggleSidebar()
      }}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-hairline hover:text-ink focus-visible:ring-2 focus-visible:ring-rosa/30',
        className,
      )}
      {...props}
    >
      <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
    </button>
  )
}

export function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return <main className={cn('relative flex h-full flex-1 flex-col overflow-y-auto', className)} {...props} />
}
