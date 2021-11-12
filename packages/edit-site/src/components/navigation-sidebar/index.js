/**
 * WordPress dependencies
 */
import { useEffect } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { createSlotFill } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { store as editSiteStore } from '../../store';
import NavigationPanel from './navigation-panel';
import NavigationToggle from './navigation-toggle';

export const {
	Fill: NavigationPanelPreviewFill,
	Slot: NavigationPanelPreviewSlot,
} = createSlotFill( 'EditSiteNavigationPanelPreview' );

export default function NavigationSidebar( {
	defaultIsOpen,
	activeTemplateType,
} ) {
	const { setIsNavigationPanelOpened } = useDispatch( editSiteStore );

	useEffect( () => {
		if ( defaultIsOpen !== undefined ) {
			setIsNavigationPanelOpened( defaultIsOpen );
		}
	}, [ defaultIsOpen ] );

	return (
		<>
			<NavigationToggle />
			<NavigationPanel activeTemplateType={ activeTemplateType } />
			<NavigationPanelPreviewSlot />
		</>
	);
}
