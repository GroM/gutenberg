/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import {
	store as blockEditorStore,
	BlockSettingsMenuControls,
} from '@wordpress/block-editor';
import { store as coreStore } from '@wordpress/core-data';
import { MenuItem } from '@wordpress/components';
import { isTemplatePart } from '@wordpress/blocks';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { store as editSiteStore } from '../../store';
import { useLink } from '../routes/link';
import { useSearchParams } from '../routes';

export default function EditTemplatePartMenuButton() {
	return (
		<BlockSettingsMenuControls>
			{ ( { selectedClientIds, onClose } ) => (
				<EditTemplatePartMenuItem
					selectedClientId={ selectedClientIds[ 0 ] }
					onClose={ onClose }
				/>
			) }
		</BlockSettingsMenuControls>
	);
}

function EditTemplatePartMenuItem( { selectedClientId, onClose } ) {
	const selectedTemplatePart = useSelect(
		( select ) => {
			const block = select( blockEditorStore ).getBlock(
				selectedClientId
			);

			if ( block && isTemplatePart( block ) ) {
				const { theme, slug } = block.attributes;

				return select( coreStore ).getEntityRecord(
					'postType',
					'wp_template_part',
					// Ideally this should be an official public API.
					`${ theme }//${ slug }`
				);
			}
		},
		[ selectedClientId ]
	);
	const currentSearchParams = useSearchParams();
	const { pushTemplatePart } = useDispatch( editSiteStore );

	const { href, onClick } = useLink( {
		postId: selectedTemplatePart.id,
		postType: 'wp_template_part',
	} );

	if ( ! selectedTemplatePart ) {
		return null;
	}

	return (
		<MenuItem
			href={ href }
			onClick={ ( event ) => {
				onClick( event );
				pushTemplatePart( currentSearchParams );
				onClose();
			} }
		>
			{
				/* translators: %s: template part title */
				sprintf( __( 'Edit %s' ), selectedTemplatePart.slug )
			}
		</MenuItem>
	);
}
