/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import {
	__experimentalNavigation as Navigation,
	__experimentalNavigationBackButton as NavigationBackButton,
	__experimentalNavigationGroup as NavigationGroup,
	__experimentalNavigationItem as NavigationItem,
	__experimentalNavigationMenu as NavigationMenu,
} from '@wordpress/components';
import { store as coreDataStore } from '@wordpress/core-data';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ESCAPE } from '@wordpress/keycodes';
import { decodeEntities } from '@wordpress/html-entities';

/**
 * Internal dependencies
 */
import MainDashboardButton from '../../main-dashboard-button';
import { useLink } from '../../routes/link';
import { store as editSiteStore } from '../../../store';

function NavLink( { params, replace, ...props } ) {
	const { href, onClick } = useLink( params, replace );

	return <NavigationItem href={ href } onClick={ onClick } { ...props } />;
}

const NavigationPanel = ( { activeTemplateType } ) => {
	const { isOpen, siteTitle } = useSelect( ( select ) => {
		const { getEntityRecord } = select( coreDataStore );

		const siteData =
			getEntityRecord( 'root', '__unstableBase', undefined ) || {};

		return {
			isOpen: select( editSiteStore ).isNavigationOpened(),
			siteTitle: siteData.name,
		};
	}, [] );
	const { setIsNavigationPanelOpened } = useDispatch( editSiteStore );

	// Ensures focus is moved to the panel area when it is activated
	// from a separate component (such as document actions in the header).
	const panelRef = useRef();
	useEffect( () => {
		if ( isOpen ) {
			panelRef.current.focus();
		}
	}, [ activeTemplateType, isOpen ] );

	const closeOnEscape = ( event ) => {
		if ( event.keyCode === ESCAPE && ! event.defaultPrevented ) {
			event.preventDefault();
			setIsNavigationPanelOpened( false );
		}
	};

	return (
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions
		<div
			className={ classnames( `edit-site-navigation-panel`, {
				'is-open': isOpen,
			} ) }
			ref={ panelRef }
			tabIndex="-1"
			onKeyDown={ closeOnEscape }
		>
			<div className="edit-site-navigation-panel__inner">
				<div className="edit-site-navigation-panel__site-title-container">
					<div className="edit-site-navigation-panel__site-title">
						{ decodeEntities( siteTitle ) }
					</div>
				</div>
				<div className="edit-site-navigation-panel__scroll-container">
					<Navigation activeItem={ activeTemplateType }>
						<MainDashboardButton.Slot>
							<NavigationBackButton
								backButtonLabel={ __( 'Dashboard' ) }
								className="edit-site-navigation-panel__back-to-dashboard"
								href="index.php"
							/>
						</MainDashboardButton.Slot>

						<NavigationMenu>
							<NavigationGroup title={ __( 'Editor' ) }>
								<NavLink title={ __( 'Site' ) } params={ {} } />
								<NavLink
									title={ __( 'Styles' ) }
									params={ { style: 'open' } }
								/>
								<NavLink
									title={ __( 'Templates' ) }
									item="wp_template"
									params={ {
										postType: 'wp_template',
									} }
								/>
								<NavLink
									title={ __( 'Template Parts' ) }
									item="wp_template_part"
									params={ {
										postType: 'wp_template_part',
									} }
								/>
							</NavigationGroup>
						</NavigationMenu>
					</Navigation>
				</div>
			</div>
		</div>
	);
};

export default NavigationPanel;
